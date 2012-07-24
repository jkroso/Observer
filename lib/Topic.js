define(['Subscription'], function (Subscription) {

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
        subscribe : function (context, callback, priority) {
            if ( typeof context === 'function' ) {
                priority = callback || 0
                callback = context
                context = window
            }
            return this.add(new Subscription(context, callback, priority || 0))
        },
        add : function ( subscriptionData ) {
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
        remove : function (callback) {
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

    return Topic
})