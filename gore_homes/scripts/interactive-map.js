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
InteractiveMap.container = {

    assetsURL: '/games/gore_homes/assets/',

    element: null,  // Container Element ref

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
        const toMatch = [
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
    * Find container by ID
    *
    * @method init
    * @param {String} id Container ID
    * @param {String} version File name
    *
    */
    init: function (id, version) {
        var container = document.getElementById(id);
        if (container) {
            this.element = container;
            this.load(version, container);
        } else {
            console.error(id + ' not found');
        }
    },


    /**
    * Listen user interactions
    *
    * @method initListeners
    *
    */
    initListeners: function() {

        this.element.addEventListener( 'pointerdown', this.onPointerDown.bind(this) );
        this.element.addEventListener( 'pointercancel', this.onPointerCancel.bind(this) );
        this.element.addEventListener( 'wheel', this.onMouseWheel.bind(this), { passive: false } );

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
        var path = window.location.origin + this.assetsURL + fileName;
        var scope = this;
        xhr = new XMLHttpRequest();
        xhr.open("GET", path, false);
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
    },

    /**
    * Load SVG image handler
    *
    * @method onload
    *
    */
    onload: null,

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
            this.scale *= this.speed;
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
            this.pointers = [];
            this.pointerUpHandler(event);
        }

        if ( this.pointers.length === 0 ) {

            this.pointerMoveHandler = this.onPointerMove.bind(this);
            this.pointerUpHandler = this.onPointerUp.bind(this);

            this.element.setPointerCapture( event.pointerId );
            this.element.addEventListener( 'pointermove', this.pointerMoveHandler );
            this.element.addEventListener( 'pointerup', this.pointerUpHandler );

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

       // if ( this.pointers.length === 0 ) {

            this.prevPinchDiff = 0;
            this.element.releasePointerCapture( event.pointerId );

            this.element.removeEventListener( 'pointermove', this.pointerMoveHandler );
            this.element.removeEventListener( 'pointerup', this.pointerUpHandler );

        // }

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
        } else if (this.pointers.length === 2) {
            // Calculate the distance between the two pointers
            var diff = Math.abs(this.pointers[0].clientX - this.pointers[1].clientX);

            console.log(diff, this.prevPinchDiff);

            if (this.prevPinchDiff > 0) {
                if (diff > this.prevPinchDiff) {
                    // The distance between the two pointers has increased
                    this.scale += 0.03;
                } else if (diff < this.prevPinchDiff) {
                    // The distance between the two pointers has decreased
                    this.scale -= 0.03;
                }


                this.scale = this.scale > this.maxScale ? this.maxScale : this.scale;
                this.scale = this.scale < 1 ? 1 : this.scale;
                
                                ///
               var xs = (this.pointers[0].clientX - this.pointX) / this.scale;
               var ys = (this.pointers[0].clientY - this.pointY) / this.scale;
                ///
                this.pointX = this.pointers[0].clientX - xs * this.scale;
                this.pointY = this.pointers[0].clientY - ys * this.scale;
  
                this.transform();
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
                    house.blockId = blockId;
                    this.housesCache[houseId] = house;
                }
            }
        }

        console.log('Blocks found:', this.blocksCollection.length);
        console.log('Houses found:', Object.keys(this.housesCache).length);
        console.log('Houses found:', this.housesCache);
    },

    /**
    * Remove user interactions
    *
    * @method removePointer
    *
    */
     removePointer: function ( event ) {

        for ( let i = 0; i < this.pointers.length; i ++ ) {

            if ( this.pointers[ i ].pointerId == event.pointerId ) {

                this.pointers.splice( i, 1 );
                return;

            }

        }

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

        var scope = this;
        this.updateTotal++;

        if (this.updateTotal > 20) {
            this.updateTotal = 0;
        } else {
            clearTimeout(this.timer);
        }

        this.timer = setTimeout(function() {
            scope.transform.call(scope);
        }, 10);

    },

    /**
    * Zoom and scroll map
    *
    * @method setTransform
    *
    */
    transform: function () {

        var rectParent = this.element.parentElement.getBoundingClientRect();
        var rect = this.element.firstChild.getBoundingClientRect();

        // fix scroll outside container: RIGHT side
        var minLeft = -1 * (rect.width - rectParent.width);
        this.pointX = this.pointX < minLeft ? minLeft : this.pointX;

        // fix scroll outside container: BOTTOM side
        var minTop = -1 * (rect.height - rectParent.height);
        this.pointY = this.pointY < minTop ? minTop : this.pointY;

        // fix scroll outside container: TOP-RIGHT corner
        this.pointX = this.pointX > 0 ? 0 : this.pointX;
        this.pointY = this.pointY > 0 ? 0 : this.pointY;

        // console.log("translate(" + this.pointX + "px, " + this.pointY + "px) this.scale(" + this.scale + ")");
        this.element.style.transform = "translate(" + this.pointX + "px, " + this.pointY + "px) scale(" + this.scale + ")";
    }
};

InteractiveMap.container.onload = function(content) {
    console.log('SVG Loaded!');

    // remove preloader
    this.hidePreloader();

    // Add loaded SVG map into the DOM
    this.element.appendChild(content);
    this.parseData();

    if (!this.detectMob()) {
        this.element.classList.add('interactive-map-animated')
    }


    // Listen user interactions
    this.initListeners();
}
InteractiveMap.container.init('interactive-map', 'v0.0.1');
