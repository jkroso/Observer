/*! Observer - v0.1.0 - 2012-06-13
* https://github.com/jkroso/Observer
* Copyright (c) 2012 Jakeb Rosoman; Licensed MIT */

define(function () { 'use strict';

    function Topic () {
        this._listeners = []
    }
    Topic.prototype = {
        createSubTopic : function (name) {
            this[name] = new Topic()
        },
        insertListener : function (subscriptionData) {
            var listeners = this._listeners.slice(),
                len = listeners.length,
                priority = subscriptionData.priority,
                i = 0,
                added = false
            
            for ( ; i < len; i++ ) {
                if ( listeners[i].priority >= priority ) {
                    listeners.splice( i , 0, subscriptionData )
                    added = true
                    break
                }
            }

            if ( !added ) {
                listeners.push(subscriptionData)
            }

            // Because the topic now references a new object any publication processes will not be affected
            this._listeners = listeners
        },
        removeListener : function (callback) {
            var listeners = this._listeners,
                len = listeners.length,
                check
            switch (typeof callback) {
            case 'function':
                check = functionChecker
                break;
            case 'string':
                check = nameChecker
                break
            case 'object':
                check = objectChecker
                break
            default:
                // if the user didn't pass a callback, all listeners will be removed
                check = passer
                break
            }
            
            // Because the topic now references a new object any publication processes will not be affected
            this._listeners = listeners.filter(function (sub) {
                return !check(sub, callback)
            })
        }
    }
    
    function functionChecker (listenerData, callback) {
        return listenerData.callback === callback
    }
    function nameChecker (listenerData, callback) {
        return listenerData.callback.name === callback
    }
    function objectChecker (listenerData, callback) {
        return listenerData === callback
    }
    function passer () {
        return true
    }

    function Subscription (context, callback, priority) {
        this.context = context
        this.callback = callback
        this.priority = priority
    }
    // All new subscriptions are returned to the user from the subscribe function. Therefore, the subscription prototype is a good place to add smarts
    Subscription.prototype = {
        trigger : function (data) {
            // __NOTE:__ Using `apply` is 25% - 45% slower than call and 30% - 80% slower than invocation, 
            // [test 1](http://jsperf.com/apply-vs-call-vs-invoke/9 "jsperf apply vs call vs invoke"),
            // [test 2](http://jsperf.com/function-invocation-regular-call-apply-new "Function invocation: regular, call, apply, new")  
            return this.callback.call(this.context, data)
        }
        // TODO: add an unsubscribe method
    }
    
    function Subject () {
        this.subscriptions = new Topic()
    }
    Subject.prototype = {
        // _Method_ __publish__ `boolean` If any callback returns false we immediately exit otherwise we simply return true to indicate
        // that all callbacks were fired without interference
        // 
        //   +   __String__ `topic` the event type
        //   +   __...?__ `data` any data you want passed to the callbacks  
        publish : function ( topic, data ) {
            var topicObject = this.subscriptions,
                directions = topic.split('.'),
                matchingTopics = [topicObject],
                location = 0,
                listeners, i, len

            // [Performance test](http://jsperf.com/while-vs-if "loop setup cost")
            if (topicObject = topicObject[directions[location]]) {
                // Collect all topics which match the topic selector
                do {
                    // Since the length is always known we can save computation by not using `Array.prototype.push` however 
                    // we must increment the counter pre-process to avoid overriding the existing objects
                    matchingTopics[++location] = topicObject
                } while (topicObject = topicObject[directions[location]])
            }
            
            
            if (location < directions.length) {
                console.info(topic+' was only subscribed as far as: ' + directions.slice(0, location).join('.'))
            }
            
            // We always have at least one topic to iterate over
            do {
                listeners = matchingTopics[location]._listeners
                len = listeners.length - 1
                // Check the topic to see if it has some subscritions...
                if (len !== -1) {
                    // ...and trigger each subscription, from highest to lowest priority
                    do {
                        // Returning false from a handler will prevent any further subscriptions from being notified
                        if (listeners[len].trigger(data) === false) {
                            return false
                        }
                    } while (len--)
                }
            // If the location is 0 the loop setup cost will not be paid
            } while (location--)

            // If we made it this far it means no subscriptions canceled propagation. So we return true to let the user know
            return true
        },

        // _Method_ __run__ A quicker version of publish designed to trigger top level topics as quickly as possible
        //   
        //   +   __String__ `topic` the event type
        //   +   __...?__ `data` any data you want passed to the callbacks
        run : function ( topic, data ) {
            // By getting the sub reference immediatly we don't need to worry about subscriptions 
            // changing since both subscribe and unsubscribe copy the listener array rather than augment it
            if (topic = this.subscriptions[topic]) {
                var listeners = topic._listeners,
                    len = listeners.length - 1
                if (len !== -1) {
                    do {
                        listeners[len].trigger(data)
                    } while ( len-- )
                }
            }
        },

        //  _Method_ __on__ `listenerObject`
        //  
        //  +   _optional_ __string__ `topics` a ' ' seperate list of topics In the format `lvl1.lvl2.lvl3.etc`
        //  +   _optional_ __object__ `context`
        //  +   __function__ `callback` the function to handle events. Should take one argument, `data`
        //  +   _optional_ __number__ `priority` 1 will trigger before 2 etc  
        on : function ( topics, context, callback, priority ) {
            switch (arguments.length) {  
            case 3:
                if (typeof callback === 'number') {
                    priority = callback
                    callback = context
                    context = window
                } else {
                    priority = 5
                }
                break
            case 2:
                callback = context
                context = window
                priority = 5
                break
            case 1:
                callback = topics
                topics = ''
                context = window
                priority = 5
                break
            case 0:
                throw 'Insufficient arguments'
                break
            }
            if (typeof callback !== 'function') {
                throw 'Incorrect argument format'
            }
            if (typeof priority !== 'number') {
                throw 'Incorrect argument format'
            }
            // No error checking for correct context type since the user may want `this` to equal something weird
            // No need to throw error for incorrect topic since accessing `split` on a non-string will throw an error
            topics = topics.split(' ')
            
            var listenerData = new Subscription(context, callback, priority),
                topicObject = this.subscriptions,
                topicLength = topics.length


            if (topics[0] === '') {
                // Install to top level
                topicObject.insertListener(listenerData)
            } else {
                // Multiple subscriptions can be set at the same time, in fact it is recommended as they end up sharing memory this way
                topics.forEach(function (topic) {
                    var topicObject = this.subscriptions

                    var directions = topic.split('.')
                    // find the correct topic to insert the subscription on
                    for (var location = 0, destination = directions.length; location < destination; location++) {
                        // Create a new topic if one does not already exist
                        if (!topicObject[directions[location]]) {
                            topicObject.createSubTopic(directions[location])
                        }
                        topicObject = topicObject[directions[location]]
                    }

                    topicObject.insertListener(listenerData)

                }, this)
            }

            // since the object which ultimately gets subscribed is returned you can catch it in a variable and use that later to unsubscribe in a more specific fashion than
            // would otherwise be if unsubscribing by callback, which removes all matching callbacks on the given topic. Returning the subscribed objects is also a plus 
            // for plug-in developers who can augment a subscriptions behavior after the fact
            return listenerData
        },


        //  _Method_ __off__
        //  
        //  +   __String__ `topic` the event type  
        //  +   _optional_ __function|string__ `callback`  
        //    + If you do not pass a callback then all sunscriptions will be rmove from that topic
        //    + If you pass a string then all subscriptions with a callback name matching that string will be remove
        //    + If you pass a function then all subscriptions with that function will be removed
        off : function ( topics, callback ) {
            if (typeof topics !== 'string') {
                throw 'Need tp provide a topic'
            }
            topics = topics.split(' ')

            topics.forEach(function (topic) {
                var directions = topic.split('.'),
                    topicObject = this.subscriptions
                // Navigate to the correct topic object
                for (var location = 0, destination = directions.length; location < destination; location++) {
                    // Stop if we are heading down a non-existant path
                    if (!topicObject[directions[location]]) {
                        topicObject = false
                        break
                    }
                    topicObject = topicObject[directions[location]]
                }

                if (topicObject) {
                    topicObject.removeListener(callback)
                }
            }, this)
        },
        // Incase the user doesn't know where the pub/sub instance came from
        constructor : Subject
    }
    Subject.prototype.unsubscribe = Subject.prototype.off
    Subject.prototype.subscribe = Subject.prototype.on

    // Make supporting constructors available on Subject so as to allow extension developers to subclass them
    Subject.Subscription = Subscription
    Subject.Topic = Topic
    return Subject
})