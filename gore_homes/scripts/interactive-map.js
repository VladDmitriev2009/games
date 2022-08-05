/**
* @module InteractiveMap
*/

/** @namespace Namespace for InteractiveMap classes and functions. */
var InteractiveMap = InteractiveMap || {};

/**
* A InteractiveMap utility
* @namespace InteractiveMap
* @class InteractiveMap
*/

InteractiveMap.LOCALHOST_URL = 'http://gore-homes';
InteractiveMap.DEV_SERVER_URL = 'https://040acc5.netsolhost.com/';

InteractiveMap.container = {

    assetsURL: '/games/gore_homes/assets/',

    isDev: location.origin === InteractiveMap.LOCALHOST_URL,
    isProd: !location.origin === InteractiveMap.LOCALHOST_URL && location.origin !== InteractiveMap.DEV_SERVER_URL,

    data: [],               // Houses info from Admin panel
    element: null,          // Container Element ref
    selectedHouseElement: null,

    blocksCollection: null, // Array<Elements>
    housesCache: {},        // Record<houseId, Element>

    disabled: false,
    panning: false,

    scale: 1,
    maxScale: 15,
    speed: 1.2,
    pointX: 0,
    pointY: 0,
    start: { x: 0, y: 0 },

    pointers: [],
    prevPinchDiff: 0,

    pointerMoveHandler: null,
    pointerUpHandler: null,

    iconSoldOut: document.createElementNS("http://www.w3.org/2000/svg", 'image'),
    iconReserved: document.createElementNS("http://www.w3.org/2000/svg", 'image'),

    /**
    * At mobile can be multi touches
    *
    * @method addPointer
    * @param {Event} Event
    *
    */
    addPointer: function ( event ) {

        this.pointers.push( event );

    },

    activate: function(houseEl) {

        var data = this.data.find(h => ('id' + h.lot_number) === houseEl.id);

        // 1 : AVAILABLE
        // 2 : RESERVED
        // 0 : SOLD OUT

        if (!data) {
            houseEl.style.opacity = 0.2;
        } else if (data.status_hose === '1') {

            data.element = houseEl;
            data.id = houseEl.id;
            data.status = houseEl.status = 'AVAILABLE';
            houseEl.addEventListener('click', this.onHouseClick.bind(this), false);

        } else if (data.status_hose === '2') {

            data.element = houseEl;
            data.id = houseEl.id;
            data.status = houseEl.status = 'RESERVED';
            houseEl.addEventListener('click', this.onTooltipClick(this.iconReserved).bind(this), false);

            this.fillHouse(houseEl, '#A7A7A7');

        } else if (data.status_hose === '0') {

            data.element = houseEl;
            data.id = houseEl.id;
            data.status = houseEl.status = 'SOLD OUT';
            houseEl.addEventListener('click', this.onTooltipClick(this.iconSoldOut).bind(this), false);

            this.applySoldOutStyle(houseEl);
        }
    },

    /**
    * Sold_Out house should have cross icon and orange color
    *
    * @method applySoldOutStyle
    * @param {Element} houseEl SVG group
    *
    */
     applySoldOutStyle: function (houseEl) {

        var group = houseEl.querySelector('[id^="Group "]');
        if (group) {
            var icon = document.createElementNS('http://www.w3.org/2000/svg', 'image');
            var bbox = group.getBBox();
            var cx = bbox.x + bbox.width / 2 - 4;   // image.width / 2
            var cy = bbox.y + bbox.height / 2 - 4;

            icon.setAttribute('href', window.location.origin + this.assetsURL + 'sold_out_cross.svg');
            icon.setAttribute('class', 'no-user-interaction');
            icon.setAttributeNS(null, 'transform', 'translate('+ cx +','+ cy +')');

            houseEl.appendChild(icon);

        } else {
            this.log('Add Cross icon failed.')
        }

        this.fillHouse(houseEl, '#FF6230');
    },

    /**
    * Remove children
    *
    * @method clean
    *
    */
    clean: function() {
        while (this.element.firstChild) {
            this.element.removeChild(this.element.firstChild);
        }
    },

    detectMob: function() {
        var toMatch = [
            /Android/i,
            /webOS/i,
            /iPhone/i,
            /iPad/i,
            /iPod/i,
            /BlackBerry/i,
            /Windows Phone/i
        ];

        return toMatch.some((toMatchItem) => {
            return navigator.userAgent.match(toMatchItem);
        });
    },

    hidePreloader: function () {
        this.clean();
    },

    /**
    * Change color for not active House
    *
    * @method fillHouse
    * @param {SVGElement} house
    *
    */
    fillHouse: function(house, hexColor) {
        var paths = house.querySelectorAll("[id^='Group '] > path");
        for (var i = 0; i < paths.length; i++) {
            paths[i].setAttribute("fill", hexColor);
        }
    },

    /**
    * Find container by ID
    * Get project by ID
    * Download SVG image map
    *
    * @method init
    * @param {String} id HTMLElement ID
    * @param {String} projectId Current user's project ID
    *
    */
    init: function (elementId, projectId) {

        var baseURL = InteractiveMap.DEV_SERVER_URL;       // Proxy to the dev server

        var container = document.getElementById(elementId);
        var scope = this;
        if (container) {
            this.element = container;

            fetch(baseURL + 'wp-json/wp/v2/posts/' + projectId)
                .then(function(response) { return response.json();})
                .then(function(data) {

                    // Phases
                    // 1 : ACTIVE
                    // 0 : NOT ACTIVE
                    data.acf.phase_group
                        .filter(phase => phase.statuses_phase === '1')
                        .forEach(houses => houses.group_houses_phase.forEach(group => {
                            scope.data = scope.data.concat(group.houses_group.map(d => d.house));
                        }));

                    scope.log(scope.data);

                    scope.load('projectId_' + projectId, container);
                });

        } else {
            console.error(elementId + ' not found');
        }
    },


    /**
    * Listen user interactions
    *
    * @method initListeners
    *
    */
    initListeners: function() {

        this.element.addEventListener( 'pointerdown', this.onPointerDown.bind(this), false );
        this.element.addEventListener( 'pointercancel', this.onPointerCancel.bind(this) );
        this.element.addEventListener( 'wheel', this.onMouseWheel.bind(this), { passive: false } );
        // this.element.addEventListener( 'dblclick', this.onDblClick.bind(this) );

        this.element.style.touchAction = 'none'; // disable touch scroll

    },

    /**
    * Load SVG image and add into the DOM
    *
    * @method load
    * @param {String} version File name
    *
    */
    load: function(version) {
        var fileName = version + ".svg";
        var path = window.location.origin + this.assetsURL;
        var scope = this;
        xhr = new XMLHttpRequest();
        xhr.open("GET", path + fileName, false);
        // Following line is just to be on the safe side;
        // not needed if your server delivers SVG with correct MIME type
        xhr.overrideMimeType("image/svg+xml");
        xhr.onload = function(e) {
            if (xhr.status === 200) {
                if (scope.onload) {
                    scope.onload(xhr.responseXML.documentElement);
                }
            } else {
                console.error(fileName + ' not found');
            }
        };
        xhr.send("");

        // Init two Tooltips
        this.iconReserved.setAttribute('href', path + 'sold_out.svg');
        this.iconSoldOut.setAttribute('href', path + 'reserved.svg');
        this.iconReserved.setAttribute('class', 'map-tooltip no-user-interaction');
        this.iconSoldOut.setAttribute('class', 'map-tooltip no-user-interaction');

    },

    log: (function() {
        return this.isProd ? function() {} : console.log;
    })(),

    /**
    * Load SVG image handler
    *
    * @method onload
    *
    */
    onload: null,

    /**
    * House select event handler
    *
    * @method onselect
    * @param {Object} House Selected Lot
    *
    */
    onselect: null,

    // onDblClick: function(event) {

    //     event.wheelDelta = 1;
    //     event.dblClickSpeed = this.speed * 2;

    //     this.onMouseWheel(event);
    // },

    onHouseClick: function(event) {
        var id = event.currentTarget.id;
        var house = this.data.find(house => house.id === id);

        if (house === this.selectedHouseElement) {
            return;
        }

        // remove previous animation
        if (this.selectedHouseElement) {
            this.selectedHouseElement.element.classList.remove('selected-lot');
        }

        this.selectedHouseElement = house;
        this.selectedHouseElement.element.classList.add('selected-lot');

        if (this.onselect) {
            this.onselect(this.selectedHouseElement);
        }
    },

    onTooltipClick: function (icon) {
        return function (event) {
            icon.classList.remove('fade');
            var bbox = event.currentTarget.getBBox();
            var tfmList = icon.transform.baseVal;
            var svgroot = icon.parentNode;
            var translate = svgroot.createSVGTransform();
            translate.setTranslate(bbox.x - 35 + bbox.width / 2, bbox.y - bbox.height * 1.25 );
            tfmList.clear();
            tfmList.appendItem(translate);
            icon.classList.add('fade');
        }
    },

    onMouseDown: function ( event ) {

        event.preventDefault();
        if (this.disabled) {
            return;
        }
        this.start = { x: event.clientX - this.pointX, y: event.clientY - this.pointY };
        this.panning = true;

    },

    onMouseMove: function(event) {
        if (!this.panning || this.disabled) return;

        this.pointX = event.clientX - this.start.x;
        this.pointY = event.clientY - this.start.y;
        this.setTransform();
    },

    onMouseWheel: function ( event ) {

        event.preventDefault();

        if (this.disabled) return;

        var xs = (event.clientX - this.pointX) / this.scale;
        var ys = (event.clientY - this.pointY) / this.scale;
        var delta = (event.wheelDelta ? event.wheelDelta : -event.deltaY);

        if (delta > 0) {
            this.scale *= event.dblClickSpeed || this.speed;
        } else {
            this.scale /= this.speed;
        }

        // set Scale limits
        this.scale = this.scale > this.maxScale ? this.maxScale : this.scale;
        this.scale = this.scale < 1 ? 1 : this.scale;

        this.pointX = event.clientX - xs * this.scale;
        this.pointY = event.clientY - ys * this.scale;

        this.setTransform();
    },

    onPointerCancel: function ( event ) {

        this.removePointer( event );

    },

    onPointerDown: function ( event ) {
        if ( this.disabled ) return;

        // fix some how not all point leave events fire and stop working
        if (this.pointers.length >= 2) {
            this.removePointer();
            this.pointerUpHandler(event);
        }

        if ( this.pointers.length === 0 ) {

            this.pointerMoveHandler = this.onPointerMove.bind(this);
            this.pointerUpHandler = this.onPointerUp.bind(this);

            // this.element.setPointerCapture( event.pointerId );
            this.element.addEventListener( 'pointermove', this.pointerMoveHandler );
            this.element.addEventListener( 'pointerup', this.pointerUpHandler );
            this.element.addEventListener( 'pointerleave', this.pointerUpHandler );

        }

        this.addPointer( event );

        if ( event.pointerType === 'touch' ) {

            this.onTouchStart( event );

        } else {

            this.onMouseDown( event );

        }
    },

    onPointerMove: function ( event ) {

        event.preventDefault();

        if ( this.disabled ) return;

        if ( event.pointerType === 'touch' ) {

            this.onTouchMove( event );

        } else {

            this.onMouseMove( event );

        }

    },

    onPointerUp: function ( event ) {

        this.removePointer( event );

        this.prevPinchDiff = 0;
        // this.element.releasePointerCapture( event.pointerId );

        this.element.removeEventListener( 'pointermove', this.pointerMoveHandler );
        this.element.removeEventListener( 'pointerup', this.pointerUpHandler );
        this.element.removeEventListener( 'pointerleave', this.pointerUpHandler );
    },

    onTouchStart: function ( event ) {

        if ( this.pointers.length === 1 ) {

            if (this.disabled) return;

            this.start = { x: event.clientX - this.pointX, y: event.clientY - this.pointY };
            this.panning = true;
        }

    },

    onTouchMove: function ( event ) {

        // Find this event in the cache and update its record with this event
        for (var i = 0; i < this.pointers.length; i++) {
            if (event.pointerId == this.pointers[i].pointerId) {
                this.pointers[i] = event;
            break;
            }
          }

        if ( this.pointers.length === 1 ) {

            this.onMouseMove(event);

        // If two pointers are down, check for pinch gestures
        } else {
            // Calculate the distance between the two pointers
            var diff = Math.abs(this.pointers[0].clientX - this.pointers[1].clientX);
            
            console.log(diff);

            if (this.prevPinchDiff > 0) {
                var zoomSpeed = 0.02;
                if (diff > this.prevPinchDiff) {
                    // The distance between the two pointers has increased
                    this.scale += zoomSpeed;
                } else if (diff < this.prevPinchDiff) {
                    // The distance between the two pointers has decreased
                    // Make ZoomOut few times quickly
                    this.scale -= zoomSpeed * 4;
                }

                this.scale = this.scale > this.maxScale ? this.maxScale : this.scale;
                this.scale = this.scale < 1 ? 1 : this.scale;

                this.setTransform();
            }

            // Cache the distance for the next move event 
            this.prevPinchDiff = diff;
        }
    },

    /**
    * Find blocks and houses
    *
    * @method parseData
    *
    */
    parseData: function () {
        this.blocksCollection = this.element.querySelectorAll("[id^='BLOCK_']");
        for (var i = 0; i < this.blocksCollection.length; i++) {
            var block = this.blocksCollection[i];
            var blockId = block.getAttribute('id');
            for (var j = 0; j < block.children.length; j++) {
                var house = block.children[j];
                var houseId = house.getAttribute('id');
                if (houseId.startsWith('id')) {
                    this.housesCache[houseId] = house;
                    this.activate(house);
                }
            }
        }

        this.log('Blocks found:', this.blocksCollection.length);
        this.log('Houses found:', Object.keys(this.housesCache).length);
        this.log('Houses found:', this.housesCache);
    },

    /**
    * Remove user interactions
    *
    * @method removePointer
    *
    */
     removePointer: function ( event ) {

        this.pointers = [];

    },

    /**
    * See a flickering effect when using CSS transforms or animations.
    * minimize change events
    *
    * @method setTransform
    *
    */
    timer: null,
    updateTotal: 0,
    setTransform: function () {

//         var scope = this;
//         this.updateTotal++;

//         if (this.updateTotal > 20) {
//             this.updateTotal = 0;
//         } else {
//             clearTimeout(this.timer);
//         }

//         this.timer = setTimeout(function() {
//             scope.transform.call(scope);
//         }, 10);
        
        this.transform();

    },

    /**
    * Zoom and scroll map
    *
    * @method transform
    *
    */
    transform: function () {

        var rectParent = this.element.parentElement.getBoundingClientRect();
        var rect = this.element.firstChild.getBoundingClientRect();

        // fix scroll outside container: RIGHT side
        var minLeft = -1 * (rectParent.width * this.scale - rectParent.width);
        this.pointX = this.pointX < minLeft ? minLeft : this.pointX;

        // // fix scroll outside container: BOTTOM side
        var minTop = -1 * (rect.height * (this.detectMob() ? 1 : this.scale) - rectParent.height);
        this.pointY = this.pointY < minTop ? minTop : this.pointY;

        // fix scroll outside container: TOP-RIGHT corner
        this.pointX = this.pointX > 0 ? 0 : this.pointX;
        this.pointY = this.pointY > 0 ? 0 : this.pointY;

        this.log("translate(" + this.pointX + "px, " + this.pointY + "px) this.scale(" + this.scale + ")");
        this.element.style.transform = "translate(" + this.pointX + "px, " + this.pointY + "px) scale(" + this.scale + ")";
    }
};

InteractiveMap.container.onload = function(content) {
    this.log('SVG Loaded!');

    // remove preloader
    this.hidePreloader();

    // Add loaded SVG map into the DOM
    this.element.appendChild(content);
    this.parseData();

    if (!this.detectMob()) {
        this.element.classList.add('interactive-map-animated');
    }

    // Listen user interactions
    this.initListeners();

    // add few images for the Tooltips
    this.element.firstChild.appendChild(this.iconReserved);
    this.element.firstChild.appendChild(this.iconSoldOut);
}


// FIXME real value from "user.projectId"
var projectId = 265;

InteractiveMap.container.init('interactive-map', projectId);
