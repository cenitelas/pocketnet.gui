var f = require('../functions');


class NotificationStats{
    constructor() {
        this.success = 0
        this.reject = 0
        this.longTime = 0
        this.fastTime = 0
    }
}

class Notifications{
    constructor() {}
    
    async init(proxy, firebase, nodeManager){
        this.proxy = proxy;
        this.firebase = firebase;
        this.nodeManager = nodeManager;
        this.lastBlock = "";
        this.workerEnable = false;
        this.queue = []
        this.height = 0
        this.stats = new NotificationStats()
        this.test()
        return this;
    }

    async worker(){

        this.workerEnable = true

        let item = this.queue.shift();
        while (item){
            const ts = Date.now();
            try {
                const node = item.node

                // console.log("Send push: ", node.id, " | ", item.height)

                const notifications = await node.rpcs("getnotifications", [item.height])

                if(!this.firebase.inited) throw new Error('Firebase not inited')

                for (const address of Object.keys(notifications?.notifiers)) {
                    const notifier = notifications?.notifiers?.[address]
                    for (const type of Object.keys(notifier?.e || [])) {
                        for(const index of notifier?.e[type] || []) {
                            const notification = notifications.data[index];
                            notification.info = notifier.i;
                            notification.type = type;
                            console.log('notification', notification)
                            await this.firebase.sendToDevices(notification, null, address);
                        }
                    }
                }

                this.stats.success++;
            } catch (e) {

                console.log("E", e)

                if(!item.reRequest){
                    item.reRequest = true;
                    this.queue.push(item)
                }
                else{
                    this.stats.reject++;
                    //block = this.queue.shift();
                    console.log("Error: block", e)
                    console.log(item.height)

                }
            }
            const totalTime = Date.now() - ts;
            this.stats.longTime = this.stats.longTime < totalTime ? totalTime : this.stats.longTime
            this.stats.fastTime = this.stats.fastTime > totalTime ? totalTime : this.stats.fastTime > 0 ? this.stats.fastTime : totalTime
            item = this.queue.shift()
        }

        this.workerEnable = false
    }

    startWorker(){
        // if(!this.workerEnable)
        //     this.worker()
    }

    info(){
        return this.stats
    }

    addblock(block, node){
        if(node.version && f.numfromreleasestring(node.version) > 0.2000025 && this.height < block.height){

            if(!this.firebase.inited) console.log("WARNING FIREBASE")

            const notification = {
                height: block.height,
                node: node,
                reRequest: false
            }

            this.height = block.height

            this.queue.push(notification)

            this.startWorker()
        }
    }

    async test(){
        try {
            await this.nodeManager.waitready()
            const node = this.nodeManager.selectbest();
            const notifications = await node.rpcs("getnotifications", [1194580])
            for (const address of Object.keys(notifications?.notifiers)) {
                const notifier = notifications?.notifiers?.[address]
                for (const type of Object.keys(notifier?.e || [])) {
                    for (const index of notifier?.e[type] || []) {
                        let notification = notifications.data[index];
                        notification.info = notifier.i;
                        notification.type = type;
                        notification = this.transaction(notification, address)
                        notification = this.setDetails(notification)
                        await this.firebase.sendToDevices(notification, null, address);
                    }
                }
            }
        }catch (e) {
            console.log('E', e)
        }
    }

    transaction(notification, address){
        if(notification.type === 'money') {
            if (notification.outputs.length && !notification.outputs?.[0]?.addresshash)
                notification.cointype = this.proxy.pocketnet.kit.getCoibaseType(notification.outputs[0])
        }
        const amount = notification?.outputs?.find(el=>el.addresshash===address)?.value;
        notification.amount = amount ? amount / 100000000 : 0
        return notification
    }

    setDetails(notification){
        switch (notification.type){
            case 'money':
                if(notification.cointype){
                    notification.type = notification.cointype;
                }
                break;
            case 'comment':
                if(notification.amount){
                    notification.type = 'commentDonate'
                }
                break;
            case 'answer':
                if(notification.amount){
                    notification.type = 'answerDonate'
                }
                break;
        }
        return notification
    }
    
    destroy(){
        this.queue = [];
    }

    dictionary(type, lang){

    }
}

module.exports = Notifications