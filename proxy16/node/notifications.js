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
        // this.test()
        return this;
    }

    async worker(){

        this.workerEnable = true

        let item = this.queue.shift();
        while (item){
            const ts = Date.now();
            try {
                const node = item.node

                console.log("Send push: ", node.id, " | ", item.height)

                const notifications = await node.rpcs("getnotifications", [item.height])

                console.log('has notifications')

                if(!this.firebase.inited) throw new Error('Firebase not inited')

                for (const type of Object.keys(notifications)) {
                    if (type === 'pocketnetteam') {

                        for (const notification of notifications?.[type] || []) {
                            await this.firebase.sendToAll(notification)
                        }

                    } else {
                        for (const address of Object.keys(notifications?.[type] || [])) {
                            for (const notification of notifications?.[type]?.[address] || []) {
                                await this.firebase.sendToDevices(notification, null, address)
                            }
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
        if(!this.workerEnable)
            this.worker()
    }

    info(){
        return this.stats
    }

    addblock(block, node){
        if(node.version && f.numfromreleasestring(node.version) > 0.2000025 && this.height < block.height){

            if(!this.firebase.inited) console.log("WARNING FIREBASE")

            console.log("ADD", block.height, node.host)

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
    
    destroy(){
        this.queue = [];
    }
}

module.exports = Notifications