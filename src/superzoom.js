class SuperZoom {
	constructor(element, options) {
		this.element = element;
		this.container = element.parentNode;
		this.options = {
			onTransform: options.onTransform || function () {},
			minZoom: options.minZoom || 1,
			maxZoom: options.maxZoom || 200,
			zoomStep: options.zoomStep || 10,
            invertedZoom: options.invertedZoom || false,
			initialZoom: options.initialZoom || 1,
			initialX: options.initialX || 0,
			initialY: options.initialY || 0,
			initialAngle: options.initialAngle || 0,
            snapRotation: options.snapRotation || false,
            snapRotationStep: options.snapRotationStep || 90,
            snapRotationTolerance: options.snapRotationTolerance || 10,
			validateMousePan:
				options.validateMousePan ||
				function () {
					return true;
				},
			validateMouseWheel:
				options.validateMouseWheel ||
				function () {
					return true;
				},
			validateTouchPan:
				options.validateTouchPan ||
				function () {
					return true;
				},
		};

		this.zoom = this.options.initialZoom;
		this.x = this.options.initialX;
		this.y = this.options.initialY;
		this.angle = this.options.initialAngle;
		this.rect = this.element.getBoundingClientRect();
		this.initialWidth = this.rect.width;
		this.initialHeight = this.rect.height;

		this.recenter();


		/* mouse input handlers */

		this.doMousePan = false;
		this.prevMouseX = 0;
		this.prevMouseY = 0;

		this.mouseDown = function (e) {
			if (!this.options.validateMousePan(e)) return;
			this.doMousePan = true;
			this.prevMouseX = e.clientX;
			this.prevMouseY = e.clientY;
		};
		this.mouseMove = function (e) {
			if (!this.doMousePan) return;
			this.moveBy(e.clientX - this.prevMouseX, e.clientY - this.prevMouseY);
			this.prevMouseX = e.clientX;
			this.prevMouseY = e.clientY;
		};
		this.mouseUp = function (e) {
			this.doMousePan = false;
		};

		this.wheel = function (e) {
			if (!this.options.validateMouseWheel(e)) return;
			var sign = e.deltaY > 0 ? 1 : -1;
            if(this.options.invertedZoom) sign = -sign;
			var delta = sign * this.options.zoomStep;
			this.zoomByMultiplier(this.getScaleMultiplier(delta) , e.clientX, e.clientY);
			
			e.preventDefault();
			e.stopPropagation();
		};

		this.mouseDown = this.mouseDown.bind(this);
		this.mouseMove = this.mouseMove.bind(this);
		this.mouseUp = this.mouseUp.bind(this);
		this.wheel = this.wheel.bind(this);

		this.container.addEventListener("mousedown", this.mouseDown);
		this.container.addEventListener("mousemove", this.mouseMove);
		this.container.addEventListener("mouseup", this.mouseUp);
		this.container.addEventListener("wheel", this.wheel);

		/* touch input handlers */

		this.doTouchPan = false;
		this.doTouchZoom = false;
		this.doTouchRotate = false;

		this.prevTouchX = 0;
		this.prevTouchY = 0;
		this.prevTouchDistance = 0;
		this.prevTouchAngle = 0;

		this.touchStart = function (e) {
			if (!this.options.validateTouchPan(e)) return;
			this.doTouchPan = true;
			if (e.touches.length == 1) {
				this.prevTouchX = e.touches[0].clientX;
				this.prevTouchY = e.touches[0].clientY;
			}

			if (e.touches.length > 1) {
				var x = (e.touches[0].clientX + e.touches[1].clientX) / 2;
				var y = (e.touches[0].clientY + e.touches[1].clientY) / 2;

				this.prevTouchX = x;
				this.prevTouchY = y;

				var distance = Math.sqrt(
					Math.pow(e.touches[0].clientX - e.touches[1].clientX, 2) +
						Math.pow(e.touches[0].clientY - e.touches[1].clientY, 2)
				);
                this.prevTouchDistance = distance;

                var angle = Math.atan2(
                    e.touches[0].clientY - e.touches[1].clientY,
                    e.touches[0].clientX - e.touches[1].clientX
                );
                this.prevTouchAngle = angle;

                
			}
			
			e.preventDefault();
			e.stopPropagation();
		};
		this.touchMove = function (e) {
			if (!this.doTouchPan) return;
			if (e.touches.length == 1) {
				this.moveBy(
					e.touches[0].clientX - this.prevTouchX,
					e.touches[0].clientY - this.prevTouchY
				);
				this.prevTouchX = e.touches[0].clientX;
				this.prevTouchY = e.touches[0].clientY;
			} else if (e.touches.length > 1) {
				var x = (e.touches[0].clientX + e.touches[1].clientX) / 2;
				var y = (e.touches[0].clientY + e.touches[1].clientY) / 2;

				this.moveBy(x - this.prevTouchX, y - this.prevTouchY);

				this.prevTouchX = x;
				this.prevTouchY = y;

				var distance = Math.sqrt(
					Math.pow(e.touches[0].clientX - e.touches[1].clientX, 2) +
						Math.pow(e.touches[0].clientY - e.touches[1].clientY, 2)
				);
                
                var scaleMultiplier =
                1 + (distance / this.prevTouchDistance - 1);

                this.zoomByMultiplier(scaleMultiplier, x, y);
                
                this.prevTouchDistance = distance;

				var angle = Math.atan2(
					e.touches[0].clientY - e.touches[1].clientY,
					e.touches[0].clientX - e.touches[1].clientX
				);
                this.rotateBy(this.toDegrees(angle - this.prevTouchAngle), x, y);



                this.prevTouchAngle = angle;

			}
			
			e.preventDefault();
			e.stopPropagation();
		};
		this.touchEnd = function (e) {
			this.doTouchPan = false;

            //detect if angle is within snap tolerance
            if(this.options.snapRotation) {
                var angle = this.angle;
                var snapAngle = this.getClosestSnapAngle(angle);
                if(Math.abs(snapAngle - angle) < this.options.snapTolerance) {
                    this.rotateTo(snapAngle);
                }
            }
		};

		this.touchStart = this.touchStart.bind(this);
		this.touchMove = this.touchMove.bind(this);
		this.touchEnd = this.touchEnd.bind(this);

		this.container.addEventListener("touchstart", this.touchStart);
		this.container.addEventListener("touchmove", this.touchMove);
		this.container.addEventListener("touchend", this.touchEnd);
	}
	destroy() {
		this.container.removeEventListener("mousedown", this.mouseDown);
		this.container.removeEventListener("mousemove", this.mouseMove);
		this.container.removeEventListener("mouseup", this.mouseUp);
		this.container.removeEventListener("wheel", this.wheel);

		this.container.removeEventListener("touchstart", this.touchStart);
		this.container.removeEventListener("touchmove", this.touchMove);
		this.container.removeEventListener("touchend", this.touchEnd);
	}
	repaint() {
		this.element.style.transform = `translate(${this.x}px, ${this.y}px) rotate(${this.angle}deg)`;
		this.element.style.width = this.initialWidth * this.zoom + "px";
		this.element.style.height = this.initialHeight * this.zoom + "px";
		this.options.onTransform();
	}
    getTransform(){
        return {
            x: this.x,
            y: this.y,
            width: this.initialWidth * this.zoom,
            height: this.initialHeight * this.zoom,
            angle: this.angle,
            scale: this.zoom,
            origin: this.element.style.transformOrigin,
            transform: this.element.style.transform
        }
    }
	moveBy(x, y) {
		this.moveTo(this.x + x, this.y + y);
	}
	moveTo(x, y) {
		this.x = x;
		this.y = y;
		this.repaint();
	}
	/* zooms with x and y being a coordinates of the zoom origin */
	zoomBy(zoom, x, y) {
        x = x || this.getCenterOrigin().x;
        y = y || this.getCenterOrigin().y;
		this.zoomTo(this.zoom + zoom, x, y);
	}
    zoomByMultiplier(multiplier, x, y) {
        x = x || this.getCenterOrigin().x;
        y = y || this.getCenterOrigin().y;
        this.zoomTo(this.zoom * multiplier, x, y);
    }
	zoomTo(zoom, x, y) {
        x = x || this.getCenterOrigin().x;
        y = y || this.getCenterOrigin().y;
		zoom = Math.max(this.options.minZoom, Math.min(this.options.maxZoom, zoom));
		var zoomFactor = zoom / this.zoom;
		this.zoom = zoom;
		this.x = x - (x - this.x) * zoomFactor;
		this.y = y - (y - this.y) * zoomFactor;
		this.repaint();
	}
    /*x and y are global, set origin to be relative to the objects width and height */
    setRotationOrigin(x, y) {
        //x = x || this.getCenterOrigin().x;
        //y = y || this.getCenterOrigin().y;
        x -= this.getRect().x;
        y -= this.getRect().y;
        x = x / this.getRect().width
        y = y / this.getRect().height
        var prevR = this.element.getBoundingClientRect()
        var previousX = prevR.x
        var previousY = prevR.y
        this.element.style.transformOrigin = `${x*100}% ${y*100}%`;
        var r = this.element.getBoundingClientRect()
        this.x += previousX - r.x
        this.y += previousY - r.y
        //this.repaint()
    }

	setRotationOriginPercent(x, y) {
        var prevR = this.element.getBoundingClientRect()
        var previousX = prevR.x
        var previousY = prevR.y
        this.element.style.transformOrigin = `${x*100}% ${y*100}%`;
        var r = this.element.getBoundingClientRect()
        this.x += previousX - r.x
        this.y += previousY - r.y
        //this.repaint()
	}

    rotateBy(angle, x, y) {
        this.rotateTo(this.angle + angle, x, y);
    }
    rotateTo(angle, x, y) {
		if(x && y) {
			this.setRotationOrigin(x, y);

		}else {
			this.setRotationOriginPercent(.5,.5)
		}        
        this.angle = angle;
        this.repaint();
    }
    
    getClosestSnapAngle(angle) {
        var snapAngle = 0;
        var minDiff = 360;
        for(var i = 0; i < 360; i += this.options.snapRotationStep) {
            var diff = Math.abs(i - angle);
            if(diff < minDiff && diff < this.options.snapRotationTolerance) {
                console.log(diff, i)
                minDiff = diff;
                snapAngle = i;
            }
        }
        return snapAngle;
    }

    getCenterOrigin() {
        return {
            x: this.x + this.getRect().width / 2,
            y: this.y + this.getRect().height / 2
        }
    }
    getRect() {
        return this.element.getBoundingClientRect()
    }

    toRadians(angle) {
        return angle * (Math.PI / 180);
    }
    toDegrees(angle) {
        return angle * (180 / Math.PI);
    }

	getScaleMultiplier(delta) {
		var sign = Math.sign(delta);
		var deltaAdjustedSpeed = Math.min(0.25, Math.abs(delta / 128));
		return Math.abs(1 - sign * deltaAdjustedSpeed);
	}
	recenter() {
		var r = this.element.getBoundingClientRect();
		//this.setRotationOrigin(r.x + r.width/2, r.y + r.height/2);
		this.rotateTo(0)
		this.moveTo(
			(window.innerWidth - r.width)/2,
			(window.innerHeight - r.height)/2
		);
	}
}
