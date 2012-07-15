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
	window.observer = new Observer()
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
			subject.on('test', yup)
		} catch (e) {
			ok(false)
		}
	})


	test( "multiple subscriptions", function() {
		expect( 4 )

		subject.on( "sub-a-1 sub-a-2 sub-a-3", function() {
			ok( true )
		})
		subject.publish( "sub-a-1" )

		subject.on( "sub-b-1 sub-b-2", function() {
			ok( true )
		})
		
		// Test for Ticket #18
		subject.on( "sub-b-1 sub-b-3", function() {
			ok( true )
		})
		
		subject.publish( "sub-b-2" )
		subject.publish( "sub-b-2" )
		subject.publish( "sub-b-3" )
	})

	test('Mixin', function () {
		expect(1)
		function Mix () {}
		var mixee = new Mix
		Observer(mixee, Mix.prototype)
		Mix.prototype.on.call(mixee, "sub-a", function() {
			ok( true )
		})
		mixee.publish( "sub-a" )
	})

	test( 'Quick publish A.K.A `run`', function () {
		expect( 1 )

		subject.on( "sub-a-1", function() {
			ok( false )
		})
		subject.on( "sub-a-1.lvl2", function() {
			ok( true )
		})

		subject.run( "sub-a-1.lvl2" )
	})

	test( "various ways of unsubscribing a specific function", function() {
		expect( 4 )
		var order = 0

		subject.on( "unsubscribe", function() {
			strictEqual( order, 0, "first subscriber called" )
			order++
		})
		var fn = function() {
			ok( false, "removed by original reference" )
			order++
		}
		subject.on( "unsubscribe", fn )
		subject.on( "unsubscribe", function() {
			strictEqual( order, 1, "second subscriber called" )
			order++
		})
		var fn2 = subject.on( "unsubscribe", function() {
			ok( false, "removed by returned reference" )
			order++
		})
		subject.off( "unsubscribe", fn )
		subject.off( "unsubscribe", fn2 )
		try {
			subject.off( "unsubscribe", function() {})
			ok( true, "no error with invalid handler" )
		} catch ( e ) {
			ok( false, "error with invalid handler" )
		}
		try {
			subject.off( "unsubscribe2", function() {})
			ok( true, "no error with invalid topic" )
		} catch ( e ) {
			ok( false, "error with invalid topic" )
		}
		subject.publish( "unsubscribe" )
	})

	test('Can unsubscribe anonamous functions while leaving named functions', function () {
		expect(2)
		subject.on('test', function () {
			ok(true, 'anonamous function ran')
		})
		subject.publish('test')
		subject.on('test', yup)
		subject.off('test', '')
		subject.publish('test')
		subject.off('test', yup)
		subject.publish('test')
	})

	test('can multi-unsubscribe', function () {
		expect(1)
		subject.on('a b c', yup)
		subject.off('a b', yup)
		subject.publish('c')
		subject.publish('b')
		subject.publish('a')
	})

	test( "unsubscribe during publish", function() {
		expect( 3 )
		var order = 0

		function racer() {
			strictEqual(order, 2, 'subs not affected')
		}

		subject.on( "racy", function() {
			strictEqual(order, 0)
			order++
		})
		subject.on( "racy", function () {
			subject.off( "racy", racer )
			strictEqual(order, 1)
			order++
		})
		subject.on( "racy", racer)
		subject.publish( "racy" )
	})

	test( "continuation", function() {
		expect( 7 )
		subject.on( "continuation", function() {
			ok( true, "first subscriber called" )
		})
		subject.on( "continuation", function() {
			ok( true, "continued after no return value" )
			return true
		})
		strictEqual( subject.publish( "continuation" ), true,
			"return true when subscriptions are not stopped" )

		subject.on( "continuation", function(event) {
			ok( true, "continued after returning true" )
			return false
		})
		subject.on( "continuation", function() {
			ok( false, "continued after returning false" )
		})
		strictEqual( subject.publish( "continuation" ), false,
			"return false when subscriptions are stopped" )
	})

	test( "priority", function() {
		expect( 6 )
		var order = 0
		subject.on( "priority", function() {
			strictEqual( order, 3, "priority default; #1" )
			order++
		})
		subject.on( "priority", function() {
			strictEqual( order, 1, "priority 1; #1" )
			order++
		}, 1 )
		subject.on( "priority", function() {
			strictEqual( order, 4, "priority default; #2" )
			order++
		})
		subject.on( "priority", function() {
			strictEqual( order, 0, "priority 10; #1" )
			order++
		}, 10 )
		subject.on( "priority", function() {
			strictEqual( order, 2, "priority 1; #2" )
			order++
		}, 1 )
		subject.on( "priority", function() {
			strictEqual( order, 5, "priority -1; #1" )
		}, -Infinity )
		subject.publish( "priority" )
	})

	test( "context", function() {
		expect( 3 )
		var obj = {},
			fn = function() {}

		subject.on( "context", function() {
			strictEqual( this, window, "default context" )
		})
		subject.on( "context", obj,function() {
			strictEqual( this, obj, "object" )
		})
		subject.on( "context", fn, function() {
			strictEqual( this, fn, "function" )
		})
		subject.publish( "context" )
	})

	test( "data", function() {
		subject.on( "data", function( data ) {
			strictEqual( data.string, "hello", "string passed" )
			strictEqual( data.number, 5, "number passed" )
			deepEqual( data.object, {
				foo: "bar",
				baz: "qux"
			}, "object passed" )
			data.string = "goodbye"
			data.object.baz = "quux"
		})
		subject.on( "data", function( data ) {
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
		subject.on('a.b.c.d', function (data) {
			strictEqual(order, 0, 'fourth level')
			order++
		})
		subject.on('a.b.c', function (data) {
			strictEqual(order, 1, 'third level')
			order++
		})
		subject.on('a.b', function (data) {
			strictEqual(order, 2, 'second level')
			order++
		})
		subject.on('a', function (data) {
			strictEqual(order, 3, 'first level')
			order++
		})
		subject.on(function (data) {
			strictEqual(order, 4, 'top level no topic')
		})
		subject.publish('a.b.c.d.e.f.g', 'Some data')
	})

	test('Clear sub-topic subscriptions', function() {
		expect(1)
		subject.on( "unsubscribeNull", function() {
			ok( true, "This was supposed to stay" )
		})
		subject.on( "unsubscribeNull.not", function() {
			ok( false, "removed by topic clear" )
		})
		subject.off('unsubscribeNull.not')
		subject.publish( "unsubscribeNull.not" )
	})

	test('Error checking', function () {
		expect(8)
		
		function noArgs () {
			subject.on()
		}
		raises(noArgs, 'Insufficient arguments')
		
		function nonFuncCallback1 () {
			subject.on('test', 3)
		}
		raises(nonFuncCallback1, 'Bad callback')
		
		function nonFuncCallback2 () {
			subject.on(3)
		}
		raises(nonFuncCallback2, 'Bad callback')
		
		function nonObjectContext1 () {
			subject.on('test', 2, function () {}, 1)
		}
		try {
			nonObjectContext1()
		} catch (e) {
			ok(false, 'should not throw an erro')
		}
		
		function nonObjectContext2 () {
			subject.on('test', 2, function () {})
		}
		try {
			nonObjectContext2()
		} catch (e) {
			ok(false, 'should not throw an erro')
		}
		
		function nonStringTopic1 () {
			subject.on(1, function () {})
		}
		raises(nonStringTopic1, 'Non string topic 2 args')
		
		function nonStringTopic2 () {
			subject.on(1, function () {}, 1)
		}
		raises(nonStringTopic2, 'Incorrect argument format', 'Non string topic 3 args')
		
		function nonStringTopic3 () {
			subject.on(1, {}, function () {}, 1)
		}
		raises(nonStringTopic3, 'Incorrect argument format', 'Non string topic 4 args')
		
		function incorrectPriority1 () {
			subject.on('test', function () {}, {})
		}
		raises(incorrectPriority1, 'Incorrect argument format', 'Bad priority')
		
		function incorrectPriority2 () {
			subject.on('test', {}, function () {}, 'priority')
		}
		raises(incorrectPriority2, 'Incorrect argument format', 'Bad priority')
	})

})
