/*global QUnit:false, module:false, test:false, asyncTest:false, expect:false*/
/*global start:false, stop:false ok:false, equal:false, notEqual:false, deepEqual:false*/
/*global notDeepEqual:false, strictEqual:false, notStrictEqual:false, raises:false*/
define(['../lib/Observer'], function(Observer) { 'use strict';

	/*
		======== A Handy Little QUnit Reference ========
		http://docs.jquery.com/QUnit

		Test methods:
			expect(numAssertions)
			stop(increment)
			start(decrement)
		Test assertions:
			ok(value, [message])
			equal(actual, expected, [message])
			notEqual(actual, expected, [message])
			deepEqual(actual, expected, [message])
			notDeepEqual(actual, expected, [message])
			strictEqual(actual, expected, [message])
			notStrictEqual(actual, expected, [message])
			raises(block, [expected], [message])
	*/
	var subject
	function yup () {
		ok(true, 'message received')
	}

	module('Subscribe', {
		setup : function () {
			subject = new Observer.constructor()
		},
		teardown : function () {
			subject = null
		}
	})
	test('Can subscribe', function () {
		expect(1)
		subject.subscribe('test', yup)
		subject.publish('test')
	})
	test('Can subscribe anonamous function', function () {
		expect(1)
		subject.subscribe('test', function () {
			ok(true)
		})
		subject.publish('test')
	})
	test('can multisubscribe at one time', function () {
		expect(2)
		subject.subscribe('a b', yup)
		subject.publish('a')
		subject.publish('b')
	})
	test( "multiple subscriptions", function() {
		expect( 4 );

		subject.subscribe( "sub-a-1 sub-a-2 sub-a-3", function() {
			ok( true );
		});
		subject.publish( "sub-a-1" );

		subject.subscribe( "sub-b-1 sub-b-2", function() {
			ok( true );
		});
		
		// Test for Ticket #18
		subject.subscribe( "sub-b-1 sub-b-3", function() {
			ok( true );
		});
		
		subject.publish( "sub-b-2" );
		subject.publish( "sub-b-2" );
		subject.publish( "sub-b-3" );
	})






	module('Publish', {
		setup : function () {
			subject = new Observer.constructor()
		},
		teardown : function () {
			subject = null
		}
	})
	test('Can prevent lower priority callbacks', function () {
		expect(0)
		subject.subscribe('test', yup, 9)
		subject.subscribe('test', function () {
			return false
		}, 1)
		subject.publish('test')
	})
	test('Wont prevent higher priority callbacks', function () {
		expect(1)
		subject.subscribe('test', yup, 9)
		subject.subscribe('test', function () {
			return false
		}, 10)
		subject.publish('test')
	})
	test('Returns a custom value when intercepting', function () {
		expect(1)
		subject.subscribe('test', function () {
			return 'suprise'
		}, 10)
		equal(subject.publish('test'), 'suprise', 'Return the same value as the intercepting callback')
	})






	module('Unsubscribe', {
		setup : function () {
			subject = new Observer.constructor()
		},
		teardown : function () {
			subject = null
		}
	})
	test( "various ways of unsubscribing a specific function", function() {
		expect( 4 );
		var order = 0;

		subject.subscribe( "unsubscribe", function() {
			strictEqual( order, 0, "first subscriber called" );
			order++;
		});
		var fn = function() {
			ok( false, "removed by original reference" );
			order++;
		};
		subject.subscribe( "unsubscribe", fn );
		subject.subscribe( "unsubscribe", function() {
			strictEqual( order, 1, "second subscriber called" );
			order++;
		});
		var fn2 = subject.subscribe( "unsubscribe", function() {
			ok( false, "removed by returned reference" );
			order++;
		});
		subject.unsubscribe( "unsubscribe", fn );
		subject.unsubscribe( "unsubscribe", fn2 );
		try {
			subject.unsubscribe( "unsubscribe", function() {});
			ok( true, "no error with invalid handler" );
		} catch ( e ) {
			ok( false, "error with invalid handler" );
		}
		try {
			subject.unsubscribe( "unsubscribe2", function() {});
			ok( true, "no error with invalid topic" );
		} catch ( e ) {
			ok( false, "error with invalid topic" );
		}
		subject.publish( "unsubscribe" );
	})
	test('Can unsubscribe anonamous functions while leaving named functions', function () {
		expect(2)
		subject.subscribe('test', function () {
			ok(true, 'anonamous function ran')
		})
		subject.publish('test')
		subject.subscribe('test', yup)
		subject.unsubscribe('test', '')
		subject.publish('test')
		subject.unsubscribe('test', yup)
		subject.publish('test')
	})
	test('can multi-unsubscribe', function () {
		expect(1)
		subject.subscribe('a b c', yup)
		subject.unsubscribe('a b', yup)
		subject.publish('c')
		subject.publish('b')
		subject.publish('a')
	})
	test('Can clear all callbacks in one go', function () {
		expect(2)
		subject.subscribe('test', function () {
			ok(true, 'anonamous function ran')
		})
		subject.subscribe('test', yup)
		subject.publish('test')
		subject.unsubscribe('test')
		subject.publish('test')
	})
	test( "unsubscribe during publish", function() {
		expect( 3 );

		function racer() {
			ok( true, "second" );
			subject.unsubscribe( "racy", racer );
		}

		subject.subscribe( "racy", function() {
			ok( true, "first" );
		});
		subject.subscribe( "racy", racer );
		subject.subscribe( "racy", function() {
			ok( true, "third" );
		});
		subject.publish( "racy" );
	})



	module('Others', {
		setup : function () {
			subject = new Observer.constructor()
		},
		teardown : function () {
			subject = null
		}
	})
	test( "continuation", function() {
		expect( 7 );
		subject.subscribe( "continuation", function() {
			ok( true, "first subscriber called" );
		});
		subject.subscribe( "continuation", function() {
			ok( true, "continued after no return value" );
			return true;
		});
		strictEqual( subject.publish( "continuation" ), true,
			"return true when subscriptions are not stopped" );

		subject.subscribe( "continuation", function() {
			ok( true, "continued after returning true" );
			return false;
		});
		subject.subscribe( "continuation", function() {
			ok( false, "continued after returning false" );
		});
		strictEqual( subject.publish( "continuation" ), false,
			"return false when subscriptions are stopped" );
	});

	test( "priority", function() {
		expect( 5 );
		var order = 0;

		subject.subscribe( "priority", function() {
			strictEqual( order, 1, "priority default; #1" );
			order++;
		});
		subject.subscribe( "priority", function() {
			strictEqual( order, 3, "priority 15; #1" );
			order++;
		}, 15 );
		subject.subscribe( "priority", function() {
			strictEqual( order, 2, "priority default; #2" );
			order++;
		});
		subject.subscribe( "priority", function() {
			strictEqual( order, 0, "priority 1; #1" );
			order++;
		}, 1 );
		subject.subscribe( "priority", {}, function() {
			strictEqual( order, 4, "priority 15; #2" );
			order++;
		}, 15 );
		subject.publish( "priority" );
	});

	test( "context", function() {
		expect( 3 );
		var obj = {},
			fn = function() {};

		subject.subscribe( "context", function() {
			strictEqual( this, window, "default context" );
		});
		subject.subscribe( "context", obj, function() {
			strictEqual( this, obj, "object" );
		});
		subject.subscribe( "context", fn, function() {
			strictEqual( this, fn, "function" );
		});
		subject.publish( "context" );
	});

	test( "data", function() {
		subject.subscribe( "data", function( string, number, object ) {
			strictEqual( string, "hello", "string passed" );
			strictEqual( number, 5, "number passed" );
			deepEqual( object, {
				foo: "bar",
				baz: "qux"
			}, "object passed" );
			string = "goodbye";
			object.baz = "quux";
		});
		subject.subscribe( "data", function( string, number, object ) {
			strictEqual( string, "hello", "string unchanged" );
			strictEqual( number, 5, "number unchanged" );
			deepEqual( object, {
				foo: "bar",
				baz: "quux"
			}, "object changed" );
		});

		var obj = {
			foo: "bar",
			baz: "qux"
		};
		subject.publish( "data", "hello", 5, obj );
		deepEqual( obj, {
			foo: "bar",
			baz: "quux"
		}, "object updated" );
	});

});
