/*  
[Check the tests](../test/Observer.html "Observer")
________________________________________________________________________________________________
*/
define(function () { 'use strict';
    
    // The constructor can be used both to create new subjects and to turn arbitrary objects into observables
    function Observer (includeMethods) {
        if ( includeMethods )
            // If `includeMethods` is an `Object` methods will be added to that otherwise we use `this`
            Observer.methods(typeof includeMethods === 'object' ? includeMethods : this)
        return Object.defineProperties(this, {
            _base : {
                value : new Topic(),
                writable : true
            }
        })
    }
    Observer.methods = function (target) {
        Object.keys(Observer.prototype).forEach(function (key) {
            if ( !target.hasOwnProperty(key) ) {
                Object.defineProperty(target, key, { 
                    value: Observer.prototype[key], 
                    writable:true,
                    configurable:true 
                })
            }
        })
        return target
    }

    function find (directions, topic, useforce) {
        directions = directions.split('.')
        // Make sure the first edge is a proper edge
        if ( directions[0] ) {
            var edge, len = directions.length, i = 0
            while ( i < len ) {
                edge = directions[i++]
                if ( topic[edge] instanceof Topic )
                    topic = topic[edge]
                else
                    if ( useforce )
                        topic = topic.createSubTopic(edge)
                    else
                        break
            }
        }
        return topic
    }

    Observer.prototype = {

        // _Method_ __publish__ `boolean` If any callback returns false we immediately exit otherwise we simply return true to indicate that all callbacks were fired without interference
        // 
        //   +   __String__ `topic` the event type
        //   +   __...?__ `data` any data you want passed to the callbacks  
        publish : function (topic, data) {
            if ( typeof topic === 'string' ) {
                // [Split test](http://jsperf.com/global-string-splitting-match-vs-regexp-vs-split)  
                topic = Observer.prototype.collect.call(this, topic.split('.'))
            } else {
                data = topic
                topic = this._base._listeners
            }
            var i = topic.length, listeners, len
            while ( i-- ) {
                listeners = topic[i]
                len = listeners.length
                if ( len > 0 ) {
                    do {
                        // Returning false from a handler will prevent any further subscriptions from being notified
                        if ( listeners[--len].trigger(data) === false ) {
                            return false
                        }
                    } while ( len )   
                }
            }
            return true
        },

        // _Method_ __run__ A quicker version of publish designed to trigger just the specified event i.e. no bubbling
        //   
        //   +   __String__ `topic` the event type
        //   +   __...?__ `data` any data you want passed to the callbacks
        run : function ( topic, data ) {
            var topicNode = this._base, len, i, j

            if ( typeof topic === 'string' ) {
                topic = topic.split('.')
                i = 0
                len = topic.length
                while ( i < len ) {
                    j = topic[i++]
                    if ( typeof topicNode[j] === 'object' )
                        topicNode = topicNode[j]
                    else
                        return false
                }
            } else
                data = topic

            topicNode = topicNode._listeners
            i = topicNode.length
            if ( i > 0 ) {
                do {
                    if ( topicNode[--i].trigger(data) === false ) {
                        return false
                    }
                } while ( i > 0 )
            }
            return true
        },

        //  _Method_ __on__ `listenerObject`
        //  
        //  +   _optional_ __string__ `topics` a ' ' separate list of topics In the format `lvl1.lvl2.lvl3.etc`
        //  +   _optional_ __object__ `context`
        //  +   __function__ `callback` the function to handle events. Should take one argument, `data`
        //  +   _optional_ __number__ `priority` 1 will trigger before 2 etc  
        on : function (topics, context, callback, priority) {
            switch ( arguments.length ) {  
                case 3:
                    if (typeof callback === 'number') {
                        priority = callback
                        callback = context
                        context = window
                    } else
                        priority = 0
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
            }

            var listenerData = new Subscription(context, callback, priority)

            // Multiple subscriptions can be set at the same time, in fact it is recommended as they end up sharing memory this way. No need to throw error for incorrect topic since accessing `split` on a non-string will throw an error anyway
            topics.split(' ').forEach(
                function (directions) {
                    find(directions, this, true).insertListener(listenerData)
                },
                this._base
            )

            // since the object which ultimately gets subscribed is returned you can catch it in a variable and use that later to unsubscribe in a more specific fashion than would otherwise be if unsubscribing by callback, which removes all matching callbacks on the given topic. Returning the subscribed objects is also a plus for plug-in developers who can augment a subscriptions behavior after the fact
            return listenerData
        },
        // Same api as on except as soon as one topic is triggered the listener will be removed from __all__ topics its topics
        once : function (topics, context, callback, priority) {
            switch ( arguments.length ) {  
                case 3:
                    if (typeof callback === 'number') {
                        priority = callback
                        callback = context
                        context = window
                    } else
                        priority = 0
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
            }
            var listenerData = new Subscription(context, callback, priority)
            listenerData._topics = []
            listenerData.trigger = function (data) {
                this._topics.forEach(function (topic) {
                    topic.removeListener(this)
                })
                return this.callback.call(this.context, data)
            }
            // I chose to use two subscriptions here instead of one as this way allows me to place the same subscriptions in each topic If I had used a closure I wouldn't of been able to return one true subscription object representing the function the user asked to subscribe
            topics.split(' ').forEach(
                function (directions) {
                    var topicObject = find(directions, this, true)
                    listenerData._topics.push(topicObject)
                    topicObject.insertListener(listenerData)
                },
                this._base
            )

            return listenerData
        },


        //  _Method_ __off__
        //  
        //  +   __String__ `topic` the event type  
        //  +   _optional_ __function|subscriptionRef|string__ `callback`  
        //    + If you do not pass a callback then all subscriptions will be removed from that topic
        //    + If you pass a string then all subscriptions with a callback name matching that string will be remove
        //    + If you pass a function then all subscriptions with that function will be removed
        off : function (topics, callback) {
            if (typeof topics !== 'string') {
                if ( !callback )
                    this._base.removeListener(topics)
                else 
                    throw 'no topic specified'
            }
                    
            topics.split(' ').forEach(
                function (topic) {
                    topic = find(topic, this, false)
                    if ( topic )
                        topic.removeListener(callback)
                },
                this._base
            )
        },
        branchingCollect : function collect (directive, start) {
            var i = 0,
                len = directive.length,
                direction,
                key,
                result = [start._listeners]
            while ( i < len ) {
                direction = directive[i++]
                key = direction[0]
                if ( key in start ) {
                    result = result.concat(collect(direction.slice(1), start[key]))
                }
            }
            return result
        },
        collect : function (directions) {
            var node = this._base,
                result = [node._listeners],
                len = directions.length,
                i = 0
            while ( i < len ) {
                node = node[directions[i++]]
                if ( node )
                    result.push(node._listeners)
                else
                    break
            }
            return result
        }
    }
    // Use property definer so it is enumerbale 
    Object.defineProperty(Observer.prototype, 'constructor', { value: Observer })
    
    
    function Subscription (context, callback, priority) {
        if ( typeof callback !== 'function' || typeof priority !== 'number' )
            throw 'Incorrect argument format'
        this.context = context
        this.callback = callback
        this.priority = priority
    }

    // All new subscriptions are returned to the user from the subscribe function. Therefore, the subscription prototype is a good place to add smarts
    Subscription.prototype = {
        trigger : function (data) {
            return this.callback.call(this.context, data)
        }
        // TODO: add an unsubscribe method
    }
    
    
    function Topic (listeners) {
        // Using discriptor to prevent non-subTopic properties from being enumerable
        Object.defineProperties(this, {
            _listeners : {
                value : Object.prototype.toString.call(listeners) === '[object Array]' ? listeners : [],
                writable : true
            }
        })
    }

    Topic.prototype = {
        createSubTopic : function (edge, listeners) {
            return this[edge] = new Topic(listeners)
        },
        insertListener : function ( subscriptionData ) {
            var listeners = this._listeners.slice(),
                priority = subscriptionData.priority,
                added = false
            
            for ( var i = 0, len = listeners.length; i < len; i++ ) {
                if ( listeners[i].priority >= priority ) {
                    listeners.splice(i, 0, subscriptionData)
                    added = true
                    break
                }
            }
            if ( !added )
                listeners.push(subscriptionData)
            
            this._listeners = listeners
            return this
        },
        removeListener : function (callback) {
            var check
            switch ( typeof callback ) {
                case 'function':
                    check = function (listenerData) {
                        return listenerData.callback !== callback
                    }
                    break
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
            return this
        },
        invoke : function (data) {
            var listeners = this._listeners,
                len = listeners.length
            // [Optimized loop](http://jsperf.com/while-vs-if/2 "If guarded do while")
            if ( len > 0 ) {
                // ...and trigger each subscription, from highest to lowest priority
                do {
                    // Returning false from a handler will prevent any further subscriptions from being notified
                    if (listeners[--len].trigger(data) === false) {
                        return false
                    }
                } while ( len )
            }
            // If we made it this far it means no subscriptions were canceled. We return `true` to let the user know
            return true
        }
    }

    return Observer
})