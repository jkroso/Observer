/*global define*/
/*
This is a fairly simple re-factor of [amplify.core.js](http://www.amplifyjs.com/api/pubsub/ "amplify") 
description with the intention of making it possible to instantiate multiple observable objects 
within the same environment. i.e to allow local messaging. I did however make some enhancements to the interface 
so even if you have used _Amplify.core_ have a quick read through the method descriptions  
[Check the tests](../test/Observer.html "Observer.html")  
________________________________________________________________________________________________
*/
define(function () { 'use strict';
    
    function Subject () {
        this.subscriptions = {}
    }
    Subject.prototype = {
        // _Method_ __publish__ `true|?` if a callback returns some value we immediately exit and return this value to whomever published the event
        // otherwise we simply return true to indicate that all callbacks were fired without interference
        // 
        //   +   __String__ `topic` the event type
        //   +   __...?__ `data` any data you want passed to the callbacks  
        publish : function ( topic ) {
            var args = Array.prototype.slice.call( arguments, 1 ),
                topicSubscriptions,
                subscription,
                length,
                i = 0,
                ret,
                subscriptions = this.subscriptions

            if ( !subscriptions[ topic ] ) {
                return // returns undefined
            }
            // should this be copied?
            // Yes just in case the the subscription set is changed within one of the callbacks...
            topicSubscriptions = subscriptions[ topic ].slice();
            
            // ...you might think we could live query the length property here then for the same effect however if 
            // a high priority subscription was added we would end up running the same callback again. creating an infinite loop
            // If we wanted to be able to run whatever subscriptions are added during callbacks we could compare the copied array
            // with the final array and run an new callbacks. However, this would be probably surprise some users
            for ( length = topicSubscriptions.length; i < length; i++ ) {
                subscription = topicSubscriptions[ i ]
                
                // __NOTE:__ Using `apply` is 25% - 45% slower than call and 30% - 80% slower than invocation, 
                // [test 1](http://jsperf.com/apply-vs-call-vs-invoke/9 "jsperf apply vs call vs invoke"),
                // [test 2](http://jsperf.com/function-invocation-regular-call-apply-new "Function invocation: regular, call, apply, new")  
                // The advantage of apply is that it allows multiple args to be passed to the function.  
                // __TODO:__ consider checking the length of args before using apply.  
                // [Findings](http://jsperf.com/if-condition/2 "Cost of an if statement") looks like an if statement adds around 30% to the cost
                // so performance benefits are fairly marginal.
                // Note: using strict mode so if context is null it will not coerce to window
                ret = subscription.callback.apply( subscription.context || window, args );
                if ( ret !== undefined && ret !== true) {
                    return ret
                }
            }
            return true
        },

        //  _Method_ __subscribe__ `this`
        subscribe : function ( topic, context, callback, priority ) {
            if ( arguments.length === 3 && typeof callback === "number" ) {
                priority = callback
                callback = context
                context = null
            }
            if ( arguments.length === 2 ) {
                callback = context
                context = null
            }
            priority = priority || 10

            var topicIndex = 0,
                topics = topic.split(' '),
                topicLength = topics.length,
                added,
                subscriptions = this.subscriptions
                
            for ( ; topicIndex < topicLength; topicIndex++ ) {
                topic = topics[ topicIndex ]
                added = false
                if ( !subscriptions[ topic ] ) {
                    subscriptions[ topic ] = []
                }

                var i = subscriptions[ topic ].length - 1,
                    subscriptionInfo = {
                        callback: callback,
                        context: context,
                        priority: priority
                    }

                for ( ; i >= 0; i-- ) {
                    if ( subscriptions[ topic ][ i ].priority <= priority ) {
                        subscriptions[ topic ].splice( i + 1, 0, subscriptionInfo )
                        added = true
                        break
                    }
                }

                if ( !added ) {
                    subscriptions[ topic ].unshift( subscriptionInfo )
                }
            }
            // since the functions you subscribed is return you can catch it in a variable and use that later to unsubscribe
            return callback
        },
        //  _Method_ __unsubscribe__ `this`
        //  
        //  +   __String__ `topic` the event type  
        //  +   __Function|undefined__ `callback` can be the actual `function`, its name as a string, or nothing at all.
        //      +   This means you do not need to have access to the actual function you wish to unsubscribe as long
        //          as it was a declared function. Or has gained name property some other way
        //      +   If you don't pass in a value for `callback` then all subscriptions will be removed
        unsubscribe : function ( topic, callback ) {
            var subscriptions = this.subscriptions,
                topics = topic.split(' '),
                topicsLength = topics.length

            while (topicsLength--) {
                topic =  topics[topicsLength]
                // If this topic does not exist we assign an empty array which will have the effect of skipping to the bottom of the function when we check it length property    
                var registered_callbacks = subscriptions[topic] || [],
                    topic_length = registered_callbacks.length
                while (topic_length--) {
                    var func = registered_callbacks[ topic_length ].callback
                    // If you don't pass a callback we will unsubsribe all
                    if ( func === callback || callback === undefined || callback === func.name ) {
                        registered_callbacks.splice( topic_length, 1 )
                        // if we have been looking for all or anonymous functions...
                        if (!callback) {
                            // ...run the inner loop again
                            // Note: since we are decrementing from the end of the array the index while still be correct next iteration
                            continue
                        } else {
                            // otherwise exit the inner loop effectively jumping to the outer loop where it will check if there are any subscriptions left to process
                            break
                        }
                    }
                }
            }
        },
        // To fix bug
        constructor : Subject
    }
    // I was going to return a instance since anyone who wants multiple observable subjects can construct new
    // ones using the instances constructor property. However for some reason the constructor of Subject points
    // to `Object`
    return new Subject()
    
})