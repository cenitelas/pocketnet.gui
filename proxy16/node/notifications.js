class Notifications{
    constructor() {}
    
    async init(proxy, firebase, nodeManager){
        this.proxy = proxy;
        this.firebase = firebase;
        this.nodeManager = nodeManager;
        this.lastBlock = "";
        this.workerEnable = false;
        this.queue = []
        // this.test()
        return this;
    }

    async worker(){
        this.workerEnable = true
        let block = this.queue.shift();
        while (block){
            try {
                const node = this.nodeManager.selectProbabilityByVersion(block.nodeId);

                if (node) {
                    console.log("Send push: ", block.nodeId, " | ", node.id, " | ", block.height)
                    const notifications = await node.rpcs("getnotifications", [block.height])
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
                block = this.queue.shift();
            }catch (e) {
                if(!block.reRequest){
                    block.reRequest = true;
                    this.queue.push(block)
                }else{
                    block = this.queue.shift();
                    console.log("Error: ",e)
                }
            }
        }
        this.workerEnable = false
    }

    startWorker(){
        if(!this.workerEnable)
            this.worker()
    }

    async sendBlock(block, nodeId){
        if(!this.queue.some(el=>el.height ===block.height)) {
           const notification = {
               height: block.height,
               nodeId: nodeId,
               reRequest: false
           }
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