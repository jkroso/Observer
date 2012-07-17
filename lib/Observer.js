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
                value : new Topic(null, this),
                writable : true
            }
        })
    }
    Observer.methods = function (target) {
        Object.keys(Observer.prototype).forEach(function (key) {
            Object.defineProperty(target, key, { 
                value: Observer.prototype[key], 
                writable:true,
                configurable:true 
            })
        })
        return target
    }

    function find (directions, topic, useforce) {
        var next
        directions = new Generator(directions)
        while ( (next = directions.next()) )
            if ( topic.hasOwnProperty(next) )
                topic = topic[next]
            else
                if ( useforce )
                    topic = topic.createSubTopic(next)
                else
                    break
        return topic
    }

    function Generator (string) {
        this.data = string
        this._last = 0
    }
    Generator.prototype = {
        next : function () {
            var next = this.data.indexOf('.', this._last), result
            if ( next === -1 ) {
                result = this.data.slice(this._last)
                this._last = this.data.length
            } else {
                result = this.data.slice(this._last, next)
                this._last = next + 1
            }
            return result
        }
    }

    Observer.prototype = {

        // _Method_ __publish__ `boolean` If any callback returns false we immediately exit otherwise we simply return true to indicate
        // that all callbacks were fired without interference
        // 
        //   +   __String__ `topic` the event type
        //   +   __...?__ `data` any data you want passed to the callbacks  
        publish : function (topic, data) {
            var topicNode = this._base, len, i, j

            if ( typeof topic === 'string' ) {
                // [Split test](http://jsperf.com/global-string-splitting-match-vs-regexp-vs-split)  
                topic = topic.split('.')
                i = 0
                len = topic.length
                while ( i < len ) {
                    j = topic[i++]
                    // hasOwnProprty is slow, but checking on type provides just as much safety so long as objects are kept out of the `topic` prototype chain
                    if ( typeof topicNode[j] === 'object' )
                        topicNode = topicNode[j]
                    else
                        break
                }
            } else
                data = topic

            do {
                // TopicNodes are immutable so we don't need to worry about them changing during publication
                i = topicNode._length
                // [Performance test](http://jsperf.com/while-vs-if "loop setup cost")
                if ( i > 0 ) {
                    do {
                        // Returning false from a handler will prevent any further subscriptions from being notified
                        if ( topicNode[--i].trigger(data) === false ) {
                            return false
                        }
                    } while ( i > 0 )
                }
            } while ( (topicNode = topicNode._parent) !== this )

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

            i = topicNode._length
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

            // Multiple subscriptions can be set at the same time, in fact it is recommended as they end up sharing memory this way
            // No need to throw error for incorrect topic since accessing `split` on a non-string will throw an error anyway
            topics.split(' ').forEach(
                function (directions) {
                    find(directions, this, true).insertListener(listenerData)
                },
                this._base
            )

            // since the object which ultimately gets subscribed is returned you can catch it in a variable and use that later to unsubscribe in a more specific fashion than
            // would otherwise be if unsubscribing by callback, which removes all matching callbacks on the given topic. Returning the subscribed objects is also a plus 
            // for plug-in developers who can augment a subscriptions behavior after the fact
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
            // I chose to use two subscriptions here instead of one as this way allows me to place the same subscriptions in each topic
            // If I had used a closure I wouldn't of been able to return one true subscription object representing the function the user asked to subscribe
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
    
    
    function Topic (name, parent) {
        // Using discriptor to prevent non-subTopic properties from being enumerable
        Object.defineProperties(this, {
            _parent : {
                value : parent,
                writable : true
            },
            _name : {
                value : name
            },
            _length : {
                value : 0,
                writable : true
            }
        })
    }

    function copy (topic) {
        var clone = new Topic(topic._name, topic._parent),
            len = topic._length, topics
        while ( len-- ) {
            // Listeners should remain enumerable
            Object.defineProperty(clone, len, {
                value : topic[len],
                writable : true,
                configurable : true
            })
            // Update any listeners which care about the topics they belong to
            topics = clone[len]._topics
            if ( topics && topics.indexOf(topic) ) {
                clone[len]._topics = topics.filter(function (t) {
                    return t !== topic
                })
            }
        }
        clone._length = topic._length
        // Copy subtopics leaving them enumerable
        Object.keys(topic).forEach(function (key) {
            clone[key] = topic[key]
        })
        return clone
    }

    Topic.prototype = {
        createSubTopic : function (name) {
            return this[name] = new Topic(name, this)
        },
        splice : function (index, remove, data) {
            this.shift(1 - remove, index, this._length -1)
            Object.defineProperty(this, index, {
                value : data,
                writable : true,
                configurable : true
            })
            return this
        },
        push : function (data) {
            Object.defineProperty(this, this._length++, {
                value : data,
                writable : true,
                configurable : true
            })
            return this
        },
        // Make the new version available within the event tree
        replace : function (topic) {
            this._parent[topic._name] = topic
            // Refer children to their new parents memory location
            Object.keys(topic).forEach(function (key) {
                topic[key]._parent = topic
            })
            return this
        },
        shift : function (offset, first, last) {
            if ( offset > 0 ) {
                while ( last >= first ) {
                    Object.defineProperty(this, last + offset, {
                        value : this[last],
                        writable : true,
                        configurable : true
                    });
                    delete this[last--]
                }
            } else {
                while ( first <= last ) {
                    if ( first + offset >= 0  ) {
                        Object.defineProperty(this, first + offset, {
                            value : this[first],
                            writable : true,
                            configurable : true
                        })
                    }
                    delete this[first++]
                }
            }
            this._length += offset
            return this
        },
        filter : function (check) {
            for ( var i = 0; i < this._length; ) {
                if ( !check(this[i++]) )
                    this.shift(-1, i, this._length - 1)
            }
            return this
        },
        insertListener : function ( subscriptionData ) {
            var clone = copy(this),
                len = clone._length,
                priority = subscriptionData.priority,
                added = false
            
            for ( var i=0; i < len; i++ ) {
                if ( clone[i].priority >= priority ) {
                    clone.splice(i, 0, subscriptionData)
                    added = true
                    break
                }
            }
            if ( !added )
                clone.push(subscriptionData)
            
            return this.replace(clone)
        },
        removeListener : function (callback) {
            var check,
                clone = copy(this)
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
            return this.replace(clone.filter(check))
        },
        invoke : function (data) {
            var len = this._length - 1
            // [Performance test](http://jsperf.com/while-vs-if "loop setup cost")
            if ( len >= 0 ) {
                // ...and trigger each subscription, from highest to lowest priority
                do {
                    // Returning false from a handler will prevent any further subscriptions from being notified
                    if (this[len].trigger(data) === false) {
                        return false
                    }
                } while ( len-- )
            }
            // If we made it this far it means no subscriptions canceled propagation. So we return true to let the user know
            return true
        }
    }

    return Observer
})