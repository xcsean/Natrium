// natrium
// license : MIT
// author : Sean Chen

import { threadId } from "node:worker_threads";
import { debug_logger, debug_level_enum } from "../../interface/debug/debug_logger";

export class debug_logger_nodeimpl implements debug_logger {
    protected _debug_level:debug_level_enum = debug_level_enum.dle_debug;

    public get debug_level() {
        return this._debug_level;
    }

    public set_level(l:debug_level_enum):void {
        this._debug_level = l;
    }

    public log(l:debug_level_enum, info:string):void {
        if(l > this._debug_level){
            return;
        }

        let dlstr = "none";
        switch(l){
            case debug_level_enum.dle_error:
                dlstr = "err:";
                break;
            case debug_level_enum.dle_system:
                dlstr = "sys:";
                break;
            case debug_level_enum.dle_debug:
                dlstr = "dbg:";
                break;
            case debug_level_enum.dle_detail:
                dlstr = "dtl:";
                break;
        }

        const logstr = `[${process.pid}][${threadId}]-${dlstr} ${info}`;
        console.log(logstr);

        // TO DO : write to log file
    }
}