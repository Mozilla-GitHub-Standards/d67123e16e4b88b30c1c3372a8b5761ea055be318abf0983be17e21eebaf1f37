( function( $ ) {
	
	// TODO -- support loose augmentation of $.markApp, in case module code is ever loaded before this. 
	
	// The markApp namespace is used for storing available module code, instances of markApp, and any context free functions
	$.markApp = {
		// holds all available modules
		modules: {},
		// we keep track of all instances of markApp in here
		instances: [],
		// helper functions go here
		fn: {}
	};
	
	// Creates a markApp instances with an element, and handles function calls on the instance
	$.fn.markApp = function( options ) {
		var $this = $( this );
		// The context each markApp instance is stored as data on that element
		var context = $this.data( 'markApp-context' );
		// On first call, we need to set things up, but on all following calls we can skip right to the API handling
		if ( !context || typeof context == 'undefined' ) {
			context = {
				// useful variables -- jquery objects get prefixed with $
				app: null,
				$container: $this,
				frameCount: 0,
				width: 0,
				height: 0,
				minWidth: 700,
				minHeight: 500,
				countries: [],
				mouseX: null,
				mouseY: null,
				mouseDown: false,
				mouseIn: false,
				modules: {},
				usersMark: null,
				defaultErrorMsg: $( '#default-error-msg' ).text(),
				defaultLoadingMsg: $( '#default-loading-msg' ).text(),
				locale: ( window.location.pathname.split("/").length > 1 ) ? window.location.pathname.split("/")[1] : "en", // locale -- set by URL, default to 'en'
				instance: $.markApp.instances.push( $this ) - 1,   // store this instances index in the global instace array
				// events
				evt: {
					resize: function( e ) {
						var availableWidth = $( window ).width();
						var availableHeight = $( window ).height() -  ( $( 'header' ).height() + $( '#callout-boxes' ).height() );
						if ( availableWidth < context.minWidth ) availableWidth = context.minWidth;
						if ( availableHeight < context.minHeight ) availableHeight = context.minHeight;
						context.$container.parent().width( availableWidth );
						context.$container.parent().height( availableHeight );
						context.width = availableWidth;
						context.height = availableHeight;
						// resize any elements with the autoResize class
						$( '.autoResize' )
							.height( availableHeight )
							.width( availableWidth )
							.trigger( 'resize.markApp', [availableWidth, availableHeight] );
					},
					mousemove: function( e ) {
						context.mouseX = e.layerX;
						context.mouseY = e.layerY;
					},
					mousedown: function( e ) {
						if( 'preventDefault' in e ) e.preventDefault();
						context.mouseDown = true;
					},
					mouseup: function( e ) {
						if( 'preventDefault' in e ) e.preventDefault();
						context.mouseDown = false;
					},
					mouseover: function( e ) {
						if( 'preventDefault' in e ) e.preventDefault();
						context.mouseIn = true;
					},
					mouseout: function( e ) {
						if( 'preventDefault' in e ) e.preventDefault();
						context.mouseX = null;
						context.mouseY = null;
						context.mouseIn = false;
					}
				},
				// publicly accessible functions
				public_fn: {
					addModule: function( context, data ) {
						var moduleName,
							moduleOptions = {};
							
						if( typeof data == "string" ) {
							moduleName = data
						} else if( typeof data == "object" ) {
							for ( var moduleData in data ) {
								moduleName = moduleData
								moduleOptions = data[moduleData];
								break;
							}
						}

						if( $.markApp.modules[moduleName] ) {
							// give this module it's own space for storing stuff if it doesn't already have it
							context.modules[moduleName] = context.modules[moduleName] || {};
							// if it has an init function, run it
							if( 'init' in $.markApp.modules[moduleName].fn )
								$.markApp.modules[moduleName].fn.init( context, moduleOptions );
						}
					},
					unloadModule: function( context, moduleName ) {
						if( moduleName == "all" ) {
							// unload all the currently loaded modules
							for ( moduleName in context.modules ) {
								// if it has a deinit function, run it
								if( 'deinit' in $.markApp.modules[moduleName].fn )
									$.markApp.modules[moduleName].fn.deinit( context );
								// remove it from our modules
								delete context.modules[moduleName];
							}
						} else if ( moduleName in context.modules ) {
							// if it has a deinit function, run it
							if( 'deinit' in $.markApp.modules[moduleName].fn )
								$.markApp.modules[moduleName].fn.deinit( context );
							// remove it from our modules
							delete context.modules[moduleName];
						}
					}
				},
				// internal functions
				fn: {
					// trigger event handlers on modules
					trigger: function( eventName, eventObj, args ) {
						
						// Add some assurances to our eventObj
						if( typeof eventObj == "undefined" )
							eventObj = { 'type': 'custom' };
						
						// trigger the global handlers first
						if ( eventName in context.evt ) {
							// if it returns false, stop the train
							if ( context.evt[eventName]( eventObj ) == false ) {
								return false;
							}
						}
						
						// run the event handler on each module that's got it
						for( var module in context.modules ) {
							if( module in $.markApp.modules && 
								'evt' in $.markApp.modules[module] &&
								eventName in $.markApp.modules[module].evt ) {
									$.markApp.modules[module].evt[eventName]( context, eventObj, args );
								}
						}
					},
					loop: function( e ) {
						// reset the delay
						setTimeout( function() { context.fn.loop( ); }, 42 );
						// incremenet the counter
						context.frameCount++;
						// dispatch the event
						context.fn.trigger( 'loop', {}, [] );
					},
					// useful for delayed loading of the country data
					withCountryCodes: function ( callback ) {
						if ( 'US' in context.countries ) {
							callback( context.countries );
						} else {
							$.ajax( {
								'url': '/media/assets/js/vendor/country_codes.json',
								'dataType': 'JSON',
								'success': function ( data ) {
									context.countries = data;
									for( var i = 0; i < data.length; i++ ) {
										context.countries[ data[i].code ] = data[i].name;
									}
									callback( context.countries );
								},
								'error': function () {
									// handle error loading countries
								}
							} );
						}
					},
					showLoader: function( msg, custom_class ) {
						var custom_class = custom_class || '';
						var msg = typeof msg === "string" ? msg : context.defaultLoadingMsg;
						// append our loader
						var $loader = $( '<div />' )
							.width( context.width )
							.height( context.height )
							.hide()
							.addClass( 'overlay-wrapper autoResize' )
							.addClass( custom_class )
							.attr( 'id', 'markapp-loader' )
							.append( $( '<div />' )
								.text( msg ) );
						context.$container
							.append( $loader );
						$loader.fadeIn( 'fast' );
					},
					hideLoader: function( ) {
						$( '#markapp-loader' ).fadeOut( 'fast', function() {
							$( this ).remove();
						} );
					},
					showError: function ( msg ) {
						// TODO -- translate this default string
						var msg = typeof msg === "string" ? msg : context.defaultErrorMsg;
						var $error = $( '<div />' )
							.width( context.width )
							.height( context.height )
							.hide()
							.click( function ( e ) {
								e.preventDefault();
								context.fn.hideError();
							} )
							.addClass( 'overlay-wrapper autoResize' )
							.attr( 'id', 'markapp-error' )
							.append( $( '<div />' )
								.attr( 'id', 'markapp-error-content' )
								.append( $( '<p />' ).text( msg ) ) );
						context.$container
							.append( $error );
						$error.fadeIn( 'fast' );
					},
					hideError: function ( ) {
						$( '#markapp-error' ).fadeOut( 'fast', function() {
							$( this ).remove();
						} );
					},
					storeData: function( key, value ) {
						if ( typeof localStorage != 'undefined' ) {
							// use localStorage if it exists
							try {
								if( typeof value === "object" ) {
									value = JSON.stringify( value );
								}
								localStorage.setItem( key, value );
							} catch (e) {
							 	 if ( e == QUOTA_EXCEEDED_ERR ) { /* data wasn't successfully saved due to quota exceed */ }
							}
						} else {
							// use cookies
							// todo -- impliment cookie fallback....maybe
						}
					},
					getData: function( key ) {
						if ( typeof localStorage != 'undefined' ) {
							var item = localStorage.getItem( key );
							if( item ) {
								if ( item[0]=="{" ) item = JSON.parse( item );
								return item;
							} else {
								return false;
							}
						}
					}
				}
			};
			// bindings
			$( window )
				.delayedBind( 300, 'resize', function( e ) {
					return context.fn.trigger( 'resize', e );
				} )
				.bind( 'keydown keypress keyup', function( e ) {
					return context.fn.trigger( e.type, e );
				} )
				.trigger( 'resize' );
			context.$container
				.bind( 'mousemove mousedown mouseup mouseover mouseout ready swap', function( e ) {
					return context.fn.trigger( e.type, e );
				} );
			// start the loop
			context.fn.loop();
		}
		
		// Convert the arguments to an array to make this easier
		var args = $.makeArray( arguments );
		
		// handle public function calls
		if ( args.length > 0 ) {
			var call = args.shift();
			if ( call in context.public_fn ) {
				context.public_fn[call]( context, typeof args[0] == 'undefined' ? {} : args[0] );
			}
		}
		
		return $this.data( 'markApp-context', context );
	};
	
}( jQuery ) );