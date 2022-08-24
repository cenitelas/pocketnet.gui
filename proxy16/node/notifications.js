var f = require('../functions');


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
        // this.test()
        return this;
    }

    async worker(){

        this.workerEnable = true

        let item = this.queue.shift();

        while (item){
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

            } catch (e) {

                console.log("E", e)

                if(!item.reRequest){
                    item.reRequest = true;
                    this.queue.push(item)
                }
                else{
                    
                    //block = this.queue.shift();
                    console.log("Error: block", e)
                    console.log(item.height)

                }
            }

            item = this.queue.shift()
        }

        this.workerEnable = false
    }

    startWorker(){
        if(!this.workerEnable)
            this.worker()
    }


    ///// dep
    /*async sendBlock(block, nodeId){
        if(!this.queue.some(el=>el.height === block.height)) {
           const item = {
               height: item.height,
               nodeId: nodeId,
               reRequest: false
           }
           this.queue.push(notification)
           this.startWorker()
        }
    }*/

    addblock(block, node){
        console.log('f.numfromreleasestring(node.version)', f.numfromreleasestring(node.version), node.version)
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

    async test(){
        // 677211 - pocketnetteam
        // 357441 - money (a lot)
        // 416415 - answer
        // 797528 - private content
        // 834482 - boosts

        const test = [677211, 357441, 357441, 416415, 797528, 834482]
        setInterval(async ()=>{
            try {
                if(this.lastBlock!==677211) {
                    const node = this.nodeManager.selectProbabilityByVersion();
                    // const notifications = await this.proxy.nodeControl.request.getNotifications([block.height])
                    if (node) {
                        const notifications = await node.rpcs("getnotifications", [677211])
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
                    }
                    this.lastBlock = 677211
                }
            }catch (e){
                console.log('Error:  ', e)
            }
        },5000)
    }
}

module.exports = Notifications