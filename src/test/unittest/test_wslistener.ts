// natrium test
// license : MIT
// author : Sean Chen

import { debug_level_enum } from "../../interface/debug/debug_logger";
import { wslistener_handler } from "../../interface/network/wslistener";
import { packet } from "../../interface/protocol/packet";
import { nat } from "../../natrium";

class handler implements wslistener_handler {
    on_connected(cid:number):void {
        nat.dbglog.log(debug_level_enum.dle_debug, `handler on connected ${cid}`);
    }
    on_disconnected(cid:number, reason:string):void {
        nat.dbglog.log(debug_level_enum.dle_debug, `handler on disconnected ${cid}, ${reason}`);

    }
    on_packet(cid:number, p:packet):void {
        nat.dbglog.log(debug_level_enum.dle_debug, `handler on packet  ${cid}, packet:${p.data}`);

        // send back
        listener.send_packet(cid, p);
    }
}

var h = new handler();
var c = nat.create_packetcodec();
var listener = nat.create_wslistener(h, c);

listener.start("127.0.0.1", 4090);