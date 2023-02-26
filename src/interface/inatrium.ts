// natrium
// license : MIT
// author : Sean Chen

import { debug_logger } from "./debug/debug_logger";
import { wsconnecter, wsconnecter_handler } from "./network/wsconnecter";
import { wslistener, wslistener_handler } from "./network/wslistener";
import { packetcodec } from "./protocol/packetcodec";

export interface inatrium {

    readonly dbglog:debug_logger;

    create_wslistener(h:wslistener_handler, p:packetcodec):wslistener;
    create_wsconnecter(h:wsconnecter_handler, p:packetcodec):wsconnecter;

    create_packetcodec():packetcodec;
}