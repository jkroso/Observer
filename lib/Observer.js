/*  
[Check the tests](../test/Observer.html "Observer.html")  
________________________________________________________________________________________________
*/
define(function () { 'use strict';

    function Topic () {
        this._listeners = []
    }
    Topic.prototype = {
        createSubTopic : function (name) {
            this[name] = new Topic()
        },
        insertListener : function (subscriptionData) {
            var listeners = this._listeners,
                len = listeners.length,
                priority = subscriptionData.priority,
                added = false
            while (len--) {
                if (listeners[len].priority <= priority) {
                    listeners.splice(len + 1, 0, subscriptionData)
                    added = true
                    break
                }
            }
            if (!added) {
                listeners.unshift(subscriptionData)
            }
        },
        removeListener : function (callback) {
            var listeners = this._listeners,
                len = listeners.length,
                check
            if (typeof callback === 'function') {
                check = functionChecker
            } else if (typeof callback === 'string') {
                check = nameChecker
            } else {
                check = objectChecker
            }

            while (len--) {
                if (check(listeners[len])) {
                    listeners.splice(len, 1)
                }
            }

            function functionChecker (listenerData) {
                return listenerData.callback === callback
            }
            function nameChecker (listenerData) {
                return listenerData.callback.name === callback
            }
            function objectChecker (listenerData) {
                return listenerData === callback
            }
        }
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
        // _Method_ __publish__ `true|?` if a callback returns some value we immediately exit and return this value to whomever published the event
        // otherwise we simply return true to indicate that all callbacks were fired without interference
        // 
        //   +   __String__ `topic` the event type
        //   +   __...?__ `data` any data you want passed to the callbacks  
        publish : function ( topic, data ) {
            var topicObject = this.subscriptions,
                directions = topic.split('.'),
                matchingTopics = [topicObject],
                location = 0,
                listeners

            // Collect all topics which match the topic selector
            while (topicObject = topicObject[directions[location++]]){
                matchingTopics.push(topicObject)
            }
            while (location--) {
                // Must copy array just incase one of the handlers modifies it
                listeners = matchingTopics[location]._listeners.slice()
                if (listeners) {
                    for (var i = 0, len = listeners.length; i < len; i++) {
                        if (listeners[i].trigger(data) === false) {
                            // Exit the dispatch process
                            return false
                        }
                    }
                }
            }
            return true
        },

        //  _Method_ __subscribe__ `listenerObject`
        subscribe : function ( topics, callback, options ) {
            var context, priority, capturing
            if (typeof callback !== 'function') {
                options = callback
                callback = topics
                topics = null
            }
            if (options) {
                // We are using strict mode so if context is null it will not coerce to window
                context = options.context || window
                priority = options.priority || 10
            } else {
                context = window
                priority = 10
            }
            var listenerData = new Subscription(context, callback, priority),
                topicObject = this.subscriptions
            if (!topics) {
                topicObject.insertListener(listenerData)
            } else {
                topics = topics.split(' ')
                var topicLength = topics.length
                // Multiple subscriptions can be set at the same time, in fact it is recommended as they end up sharing memory this way
                while (topicLength--) {
                    var directions = topics[topicLength].split('.')
                    // find the correct topic to insert the subscription on
                    for (var location = 0, destination = directions.length; location < destination; location++) {
                        // Create a new topic if one does not already exist
                        if (!topicObject[directions[location]]) {
                            topicObject.createSubTopic(directions[location])
                        }
                        topicObject = topicObject[directions[location]]
                    }
                    topicObject.insertListener(listenerData)
                    topicObject = this.subscriptions
                }
            }
            // since the object which ultimately gets subscribed is returned you can catch it in a variable and use that later to unsubscribe in a more specific fashion than
            // would otherwise be if unsubscribing by callback, which removes all matching callbacks on the given topic. Returning the subscribed objects is also a plus 
            // for plug-in developers who can augment a subscriptions behavior after the fact
            return listenerData
        },


        //  _Method_ __unsubscribe__ `this`
        //  
        //  +   __String__ `topic` the event type  
        //  +   __Function|undefined__ `callback` can be the actual `function`, its name as a string, or nothing at all.
        //      +   This means you do not need to have access to the actual function you wish to unsubscribe as long
        //          as it was a declared function. Or has gained name property some other way
        //      +   If you don't pass in a value for `callback` then all subscriptions will be removed
        unsubscribe : function ( topics, callback, capturing ) {
            if (arguments.length < 2) {
                throw 'Not enough arguments provided'
            }
            topics = topics.split(' ')
            var topicsIndex = topics.length
            // Loop over all provided topics
            while (topicsIndex--) {
                var directions = topics[topicsIndex].split('.'),
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
                    topicObject.removeListener(callback, capturing || false)
                }
            }
        },
        // Incase the user doesn't know where the pub/sub instance came from
        constructor : Subject
    }

    // Make supporting constructors available on Subject so as to allow extension developers to subclass them
    Subject.Subscription = Subscription
    Subject.Topic = Topic
    return Subject
})