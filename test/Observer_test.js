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

	module('', {
		setup : function () {
			subject = new Observer()
		},
		teardown : function () {
			subject = null
		}
	})

	test('Can subscribe', function () {
		expect(0)
		try {
			subject.subscribe('test', yup)
		} catch (e) {
			ok(false)
		}
	})

	test( "multiple subscriptions", function() {
		expect( 4 )

		subject.subscribe( "sub-a-1 sub-a-2 sub-a-3", function() {
			ok( true )
		})
		subject.publish( "sub-a-1" )

		subject.subscribe( "sub-b-1 sub-b-2", function() {
			ok( true )
		})
		
		// Test for Ticket #18
		subject.subscribe( "sub-b-1 sub-b-3", function() {
			ok( true )
		})
		
		subject.publish( "sub-b-2" )
		subject.publish( "sub-b-2" )
		subject.publish( "sub-b-3" )
	})

	test( "various ways of unsubscribing a specific function", function() {
		expect( 4 )
		var order = 0

		subject.subscribe( "unsubscribe", function() {
			strictEqual( order, 0, "first subscriber called" )
			order++
		})
		var fn = function() {
			ok( false, "removed by original reference" )
			order++
		}
		subject.subscribe( "unsubscribe", fn )
		subject.subscribe( "unsubscribe", function() {
			strictEqual( order, 1, "second subscriber called" )
			order++
		})
		var fn2 = subject.subscribe( "unsubscribe", function() {
			ok( false, "removed by returned reference" )
			order++
		})
		subject.unsubscribe( "unsubscribe", fn )
		subject.unsubscribe( "unsubscribe", fn2 )
		try {
			subject.unsubscribe( "unsubscribe", function() {})
			ok( true, "no error with invalid handler" )
		} catch ( e ) {
			ok( false, "error with invalid handler" )
		}
		try {
			subject.unsubscribe( "unsubscribe2", function() {})
			ok( true, "no error with invalid topic" )
		} catch ( e ) {
			ok( false, "error with invalid topic" )
		}
		subject.publish( "unsubscribe" )
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

	test( "unsubscribe during publish", function() {
		expect( 3 )

		function racer() {
			ok( true, "second" )
			subject.unsubscribe( "racy", racer )
		}

		subject.subscribe( "racy", function() {
			ok( true, "first" )
		})
		subject.subscribe( "racy", racer )
		subject.subscribe( "racy", function() {
			ok( true, "third" )
		})
		subject.publish( "racy" )
	})

	test( "continuation", function() {
		expect( 7 )
		subject.subscribe( "continuation", function() {
			ok( true, "first subscriber called" )
		})
		subject.subscribe( "continuation", function() {
			ok( true, "continued after no return value" )
			return true
		})
		strictEqual( subject.publish( "continuation" ), true,
			"return true when subscriptions are not stopped" )

		subject.subscribe( "continuation", function(event) {
			ok( true, "continued after returning true" )
			return false
		})
		subject.subscribe( "continuation", function() {
			ok( false, "continued after returning false" )
		})
		strictEqual( subject.publish( "continuation" ), false,
			"return false when subscriptions are stopped" )
	})

	test( "priority", function() {
		expect( 5 )
		var order = 0
		subject.subscribe( "priority", function() {
			strictEqual( order, 1, "priority default; #1" )
			order++
		})
		subject.subscribe( "priority", function() {
			strictEqual( order, 3, "priority 15; #1" )
			order++
		}, {priority:15} )
		subject.subscribe( "priority", function() {
			strictEqual( order, 2, "priority default; #2" )
			order++
		})
		subject.subscribe( "priority", function() {
			strictEqual( order, 0, "priority 1; #1" )
			order++
		}, {priority:1} )
		subject.subscribe( "priority", function() {
			strictEqual( order, 4, "priority 15; #2" )
			order++
		}, {priority:15} )
		subject.publish( "priority" )
	})

	test( "context", function() {
		expect( 3 )
		var obj = {},
			fn = function() {}

		subject.subscribe( "context", function() {
			strictEqual( this, window, "default context" )
		})
		subject.subscribe( "context", function() {
			strictEqual( this, obj, "object" )
		}, {context:obj})
		subject.subscribe( "context", function() {
			strictEqual( this, fn, "function" )
		}, {context:fn})
		subject.publish( "context" )
	})

	test( "data", function() {
		subject.subscribe( "data", function( data ) {
			strictEqual( data.string, "hello", "string passed" )
			strictEqual( data.number, 5, "number passed" )
			deepEqual( data.object, {
				foo: "bar",
				baz: "qux"
			}, "object passed" )
			data.string = "goodbye"
			data.object.baz = "quux"
		})
		subject.subscribe( "data", function( data ) {
			strictEqual( data.string, "goodbye", "string changed" )
			strictEqual( data.number, 5, "number unchanged" )
			deepEqual( data.object, {
				foo: "bar",
				baz: "quux"
			}, "object changed" )
		})

		var obj = {
			foo: "bar",
			baz: "qux"
		}
		subject.publish( "data", {string: "hello", number:5, object: obj} )
		deepEqual( obj, {
			foo: "bar",
			baz: "quux"
		}, "object updated" )
	})

	test('Specificity ordering', function() {
		expect(5)
		var order = 0
		subject.subscribe('a.b.c.d', function (data) {
			strictEqual(order, 0, 'fourth level')
			order++
		})
		subject.subscribe('a.b.c', function (data) {
			strictEqual(order, 1, 'third level')
			order++
		})
		subject.subscribe('a.b', function (data) {
			strictEqual(order, 2, 'second level')
			order++
		})
		subject.subscribe('a', function (data) {
			strictEqual(order, 3, 'first level')
			order++
		})
		subject.subscribe(function (data) {
			strictEqual(order, 4, 'top level no topic')
		})
		subject.publish('a.b.c.d.e.f.g', 'Some data')
	})

	test('Clear sub-topic subscriptions', function() {
		expect(1)
		subject.subscribe( "unsubscribeNull", function() {
			ok( true, "This was supposed to stay" )
		})
		subject.subscribe( "unsubscribeNull.not", function() {
			ok( false, "removed by topic clear" )
		})
		subject.unsubscribe('unsubscribeNull.not')
		subject.publish( "unsubscribeNull.not" )
	})

})
