// natrium
// license : MIT
// author : Sean Chen

import { isMainThread, Worker, MessageChannel, workerData, parentPort } from "node:worker_threads";
import { debug_level_enum } from "../../interface/debug/debug_logger";
import { network } from "../../interface/network/network";

import { natrium_services, service, serviceconf } from "../../interface/service/service";
import { servicechannel, serviceworker } from "../../interface/service/serviceworker";
import { session } from "../../interface/session/session";
import { natrium_nodeimpl } from "../natrium_nodeimpl";
import { session_nodeimpl } from "../session/session_nodeimpl";
import { _Service_M2W_MSG, _Service_W2M_MSG } from "../_node/_therads_msgs";
import { _Node_MainTrhead, _Node_WorkerThread } from "../_node/_threads";
import { _service_workers } from "./_service_workers";

export class servicechannel_nodeimpl implements servicechannel {
    
    protected _worker_port:null|Worker|MessagePort = null;

    public set_worker_thread(t:Worker|MessagePort):void {
        this._worker_port = t;
    }

    public dispatch_service_task(command:string, data:any):void {
        this._worker_port?.postMessage({cmd:_Service_M2W_MSG._m2w_service_task, command:command, data:data});
    }

    public dispatch_session_msg(sid:number, command:string, data:any):void {
        this._worker_port?.postMessage({cmd:_Service_M2W_MSG._m2w_session_msg, sid:sid, command:command, data:data});
    }
    public brodcast_session_msg(command:string, data:any):void {
        this._worker_port?.postMessage({cmd:_Service_M2W_MSG._m2w_bcast_msg, command:command, data:data});
    }
    
    // public session_rpc_sync(sid:number, command:string, data:any):any {
    //     // this._worker_port?.postMessage({cmd:_woker_cmds.wc_rpc_sync, sid:sid, command:command, data:data});
    //     return null;
    // }
}

export class serviceworker_nodeimpl implements serviceworker {

    protected _thread_id:number = 0;
    protected _service_name:string = "";
    protected _service_index:number = 0;
    protected _channel:servicechannel_nodeimpl = new servicechannel_nodeimpl();

    protected _worker_thread:null|_Node_WorkerThread = null;

    public get thread_id() {
        return this._thread_id;
    }
    public get service_name() {
        return this._service_name;
    }
    public get service_index() {
        return this._service_index;
    }
    public get channel() {
        return this._channel;
    }

    public set_service_index(i:number):void {
        this._service_index = i;
    }

    public start_service(c:serviceconf):boolean {
        this._worker_thread = _Node_MainTrhead.createWorker(
            _service_workers.make_service_thread_uname(c.service_name, this._service_index),  
            "./_node_implements/service/_service_nodeworker_impl.ts",
            {
                conf:c,
                si:this._service_index
            }
            // ,
            // // resource limits
            // {
            //     maxYoungGenerationSizeMb:,
            //     maxOldGenerationSizeMb:,
            //     codeRangeSizeMb:,
            //     stackSizeMb:
            // }
        );

        this._service_name = c.service_name;
        this._thread_id = this._worker_thread.threadId;

        this._channel.set_worker_thread(this._worker_thread.worker);

        let thisptr = this;

        this._worker_thread.on('message', (msg)=>{
            thisptr._on_worker_msg(msg);
        });

        return true;
    }
    public finish_service():boolean {
        if(this._worker_thread == null) {
            natrium_nodeimpl.impl.dbglog.log(debug_level_enum.dle_error, `serviceworker_nodeimpl service:${this._service_name} index:${this._service_index} finish_service thread not start`);
            return true;
        }

        this._worker_thread.finish();

        // wait worker exit
        // TO DO : off _worker_thread listener

        return true;
    }

    public add_session(s:session):void {
        if(this._worker_thread == null) {
            natrium_nodeimpl.impl.dbglog.log(debug_level_enum.dle_error, `serviceworker_nodeimpl service:${this._service_name} index:${this._service_index} add session:${s.session_id} thread not start`);
            return;
        }

        this._worker_thread.worker.postMessage({cmd:_Service_M2W_MSG._m2w_add_session, sid:s.session_id, skey:s.session_key});
        s.set_service(this._service_name, this._service_index);
    }
    public remove_session(s:session):void {
        if(this._worker_thread == null) {
            natrium_nodeimpl.impl.dbglog.log(debug_level_enum.dle_error, `serviceworker_nodeimpl service:${this._service_name} index:${this._service_index} rmv session:${s.session_id} thread not start`);
            return;
        }

        this._worker_thread.worker.postMessage({cmd:_Service_M2W_MSG._m2w_rmv_session, sid:s.session_id});
        s.set_service("", 0);
    }
    public on_session_close(s:session):void {
        if(this._worker_thread == null) {
            natrium_nodeimpl.impl.dbglog.log(debug_level_enum.dle_error, `serviceworker_nodeimpl service:${this._service_name} index:${this._service_index} close session:${s.session_id} thread not start`);
            return;
        }

        this._worker_thread.worker.postMessage({cmd:_Service_M2W_MSG._m2w_close_session, sid:s.session_id});
    }

    protected _on_worker_msg(msg:any){
        switch(msg.id)
        {
        case _Service_W2M_MSG._w2m_session_msg:
            {
                // TO DO : send session message

                // for Debug ...
                let l = network.get_wslistener(0);
                l.send_packet(msg.sid, l.pcodec.create_jsonpkt(msg)); // sid = cid
            }
            break;
        }
    }
}