define(function () { 'use strict';

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

    return Subscription
})