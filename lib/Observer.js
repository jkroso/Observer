/*  
[Check the tests](../test/Observer.html "Observer")
________________________________________________________________________________________________
*/
define(function () { 'use strict';
    
    // The constructor can be used both to create new subjects and to turn arbitrary objects into observables
    function Subject ( targetObject ) {
        if (typeof targetObject === 'object') {
            targetObject.publish = Subject.prototype.publish
            targetObject.run = Subject.prototype.run
            targetObject.on = Subject.prototype.on
            targetObject.off = Subject.prototype.off
        }
        (targetObject || this).__base__ = new Topic()
    }

    Subject.prototype = {

        // _Method_ __publish__ `boolean` If any callback returns false we immediately exit otherwise we simply return true to indicate
        // that all callbacks were fired without interference
        // 
        //   +   __String__ `topic` the event type
        //   +   __...?__ `data` any data you want passed to the callbacks  
        publish : function ( topic, data ) {
            var topicNode = this.__base__[topic],
                listeners, len

            if ( !topicNode ) {
                
                topicNode = this.__base__
                topic = topic.split('.')
                len = 0
                
                while ( len < topic.length ) {
                    if ( topicNode.hasOwnProperty(topic[len]) ) {
                        topicNode = topicNode[topic[len++]]
                    } else {
                        break
                    }
                }
            }

            do {
                
                listeners = topicNode._listeners,
                len = listeners.length - 1
                
                // [Performance test](http://jsperf.com/while-vs-if "loop setup cost")
                if ( len >= 0 ) {
                    // ...and trigger each subscription, from highest to lowest priority
                    do {
                        // Returning false from a handler will prevent any further subscriptions from being notified
                        if ( (topic = listeners[len]).callback.call(topic.context, data) === false ) {
                            return false
                        }
                    } while ( len-- )
                }
                
            } while ( (topicNode = topicNode._parent) !== undefined )

            return true
        },

        // _Method_ __run__ A quicker version of publish designed to trigger top level topics as quickly as possible
        //   
        //   +   __String__ `topic` the event type
        //   +   __...?__ `data` any data you want passed to the callbacks
        run : function ( topic, data ) {
            var len
            // By getting the sub reference immediatly we don't need to worry about subscriptions 
            // changing since both subscribe and unsubscribe copy the listener array rather than augment it
            if (topic = this.__base__[topic]) {
                topic = topic._listeners
                len = topic.length - 1
                if (len !== -1) {
                    do {
                        if (topic[len].trigger(data) === false) {
                            return false
                        }
                    } while ( len-- )
                }
                return true
            }
            // If no topic exists `undefined` is returned
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
                    priority = 0
                }
                break
            case 2:
                callback = context
                context = window
                priority = 0
                break
            case 1:
                callback = topics
                topics = ''
                context = window
                priority = 0
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
            
            var listenerData = new Subscription(context, callback, priority)

            if ( topics === '' ) {
                // Install to top level
                this.__base__.insertListener(listenerData)
            } else {
                // Multiple subscriptions can be set at the same time, in fact it is recommended as they end up sharing memory this way
                // No need to throw error for incorrect topic since accessing `split` on a non-string will throw an error anyway
                topics.split(' ').forEach(function (topic) {
                    var topicObject = this.__base__

                    var directions = topic.split('.')
                    // find the correct topic to insert the subscription on
                    for ( var location = 0, destination = directions.length; location < destination; location++ ) {
                        // Create a new topic if one does not already exist
                        if ( topicObject.hasOwnProperty([directions[location]]) ) {
                            topicObject = topicObject[directions[location]]
                        } else {
                            topicObject = topicObject.createSubTopic(directions[location], directions.slice(0, location + 1).join('.'))
                        }
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

            topics.split(' ').forEach(function seek (topic) {
                var direction = car(topic)
                
                if (!direction) {
                    this.removeListener(callback)
                } else {
                    // Stop if we are heading down a non-existant path
                    if (!this.hasOwnProperty(direction)) {
                        return
                    }
                    seek.call(this[direction], cdr(topic))
                }

            }, this.__base__)
        },
        // Incase the user doesn't know where the pub/sub instance came from
        constructor : Subject
    }
    
    
    function Subscription (context, callback, priority) {
        this.context = context
        this.callback = callback
        this.priority = priority
    }

    // All new subscriptions are returned to the user from the subscribe function. Therefore, the subscription prototype is a good place to add smarts
    Subscription.prototype = {
        trigger : function (data) {
            // [Call is faster than apply](http://jsperf.com/apply-vs-call-vs-invoke/9 "jsperf apply vs call vs invoke")
            return this.callback.call(this.context, data)
        }
        // TODO: add an unsubscribe method
    }
    
    
    function Topic ( parentNode ) {
        this._listeners = []
        this._parent = parentNode
    }

    Topic.prototype = {

        createSubTopic : function ( subName, fullAddress ) {
            this[subName] = new Topic(this)
            var topicObject = this
            while ( topicObject._parent ) {
                topicObject = topicObject._parent
            }
            // Create top level mapping
            return topicObject[fullAddress] = this[subName]
        },

        insertListener : function ( subscriptionData ) {
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

        removeListener : function ( callback ) {
            var check

            switch (typeof callback) {
            case 'function':
                check = function (listenerData) {
                    return listenerData.callback !== callback
                }
                break;
            case 'string':
                check = function (listenerData) {
                    return listenerData.callback.name !== callback
                }
                break
            case 'object':
                check = function (listenerData) {
                    return listenerData !== callback
                }
                break
            default:
                // if the user didn't pass a callback, all listeners will be removed
                check = function () {
                    return false
                }
            }

            this._listeners = this._listeners.filter(check)
        },

        invokeListeners : function ( data ) {
            var listeners = this._listeners,
                len = listeners.length - 1
            // [Performance test](http://jsperf.com/while-vs-if "loop setup cost")
            if (len !== -1) {
                // ...and trigger each subscription, from highest to lowest priority
                do {
                    // Returning false from a handler will prevent any further subscriptions from being notified
                    if (listeners[len].trigger(data) === false) {
                        return false
                    }
                } while (len--)
            }

            // If we made it this far it means no subscriptions canceled propagation. So we return true to let the user know
            return true
        }
    }

    function car ( topic ) {
        var i = topic.indexOf('.')
        if (i === -1) {
            return topic
        } else {
            return topic.substr(0, i)
        }
    }

    function cdr ( topic ) {
        var i = topic.indexOf('.')
        if (i === -1) {
            return ''
        } else {
            return topic.substr(i + 1)
        }
    } 

    // Create aliases
    Subject.prototype.unsubscribe = Subject.prototype.off
    Subject.prototype.subscribe = Subject.prototype.on

    // Make supporting constructors available on Subject so as to allow extension developers to subclass them
    Subject.Subscription = Subscription

    return Subject
})