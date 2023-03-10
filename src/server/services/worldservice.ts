// natrium
// license : MIT
// author : Sean Chen


import { nat } from "../..";
import { serviceconf } from "../../interface/config/configs";
import { debug_level_enum } from "../../interface/debug/debug_logger";
import { natrium_services } from "../../interface/service/service";
import { servicesession } from "../../interface/service/servicesession";
import { ServerErrorCode } from "../../share/msgs/msgcode";
import { _Node_SessionContext } from "../../_node_implements/_node/_thread_contexts";
import { generic_behaviour } from "../gameframework/behaviours/generic_behaviour";
import { generic_playerdata_comp } from "../gameframework/datacomponent/generic_playerdata";
import { game } from "../gameframework/game";
import { game_map } from "../gameframework/gameobjects/game_map";
import { player, player_datas } from "../gameframework/player";
import { outgameservice } from "./outgameservice";
import { servicebase } from "./servicebase";

export interface gamemap_conf {
    in_thissrevice:boolean;
    conf:any;
}

export class worldservice extends servicebase {

    protected _gamemaps = new Map<number, game_map>();
    protected _gamemapconfs = new Map<number, gamemap_conf>();

    public static create(c:serviceconf) {
        return new worldservice(c);
    }
    
    constructor(c:serviceconf) {
        super(c);
    }

    public override async startup():Promise<boolean> {
        // register behaviours
        game.impl.register_player_behaviours(generic_behaviour.beh_name, generic_behaviour.creater);

        // register datacomponents
        game.impl.register_player_datacomponents(generic_playerdata_comp.comp_name, generic_playerdata_comp.creater);

        // init map
        this.init_map();

        return super.startup();
    }
    public override async shutdown():Promise<boolean> {
        return super.startup();
    }

    public get_mapconf(mapid:number):gamemap_conf|undefined {
        return this._gamemapconfs.get(mapid);
    }
    public get_map(mapid:number):game_map|undefined {
        return this._gamemaps.get(mapid);
    }

    protected init_map():void {
        let mapconfigs = nat.conf.get_config_data("map");

        let mapidarys = new Array<number>();
        for(let i=0; i<mapconfigs.maps.length; ++i){
            let mc = mapconfigs.maps[i];

            if((mc.id % this._conf.service_count) != this._service_index){
                this._gamemapconfs.set(mc.id, {in_thissrevice:false, conf:mc});
                continue;
            }
            
            this._gamemapconfs.set(mc.id, {in_thissrevice:true, conf:mc});

            mapidarys.push(mc.id);

            let map = new game_map();
            map.init_map(mc);

            this._gamemaps.set(mc.id, map);
        }

        nat.dbglog.log(debug_level_enum.dle_system, `worldservice:${this._service_index} init maps:[${mapidarys}]`);
    }

    public override async on_add_session(sid:number, skey:string):Promise<servicesession> {
        const new_ses = await super.on_add_session(sid, skey);

        nat.dbglog.log(debug_level_enum.dle_debug, `worldservice:${this._service_index} on add session  ${sid}, ${skey}`);
        
        let ses_base_data = await nat.datas.read_session_data(sid, "base");
        if(ses_base_data == undefined) {
            // error 
            _Node_SessionContext.sendWSMsg(sid, "server_error", {res:ServerErrorCode.ResServiceSessionNotExist});
            _Node_SessionContext.kickPlayer(sid, "no ses data");
            return new_ses;
        }
        
        let player_base_data = await nat.datas.read_player_data(ses_base_data.uid, "generic");
        if(player_base_data == undefined) {
            // error 
            _Node_SessionContext.sendWSMsg(sid, "server_error", {res:ServerErrorCode.ResServicePlayerNotExist});
            _Node_SessionContext.kickPlayer(sid, "no player data");
            return new_ses;
        }

        const pl = await this.create_player(new_ses, new player_datas(ses_base_data.uid));
        if(pl == null) {
            // error 
            _Node_SessionContext.sendWSMsg(new_ses.session_id, "server_error", {res:ServerErrorCode.ResCreatePlayerError});
            _Node_SessionContext.kickPlayer(sid, "create player error");
            return new_ses;
        }

        let plgedata = pl.datas.get_dataobj(generic_playerdata_comp.comp_name);
        if(plgedata == null){
            // error 
            _Node_SessionContext.sendWSMsg(new_ses.session_id, "server_error", {res:ServerErrorCode.ResPlayerDataNotExist});
            _Node_SessionContext.kickPlayer(sid, "player data error");
            return new_ses;
        }
        
        // TO DO : add player to map
        let map = this._gamemaps.get(plgedata.data.mapid);
        if(map == undefined){
            // error 
            // TO DO : kick player
            _Node_SessionContext.sendWSMsg(new_ses.session_id, "server_error", {res:ServerErrorCode.ResPlayerDataNotExist});
            _Node_SessionContext.kickPlayer(sid, `mapid:${plgedata.data.mapid} not in worldservice:${this._service_index}` );
            return new_ses;
        }

        if(ses_base_data.firstin){
            // first in game, send entergame res
            let enter_game_res = {
                res:ServerErrorCode.ResOK,
                data:{
                    mapid:plgedata.data.mapid,
                    info:{
                        sinfo:plgedata.data
                    },
                    heros:plgedata.data.heros,
                    pets:[],
                    ships:[]
                }
            }
            _Node_SessionContext.sendWSMsg(new_ses.session_id, "enter_game_res", enter_game_res);

            // update firstinf data
            nat.datas.update_session_data(sid, "base", false, "$.firstin");
        }


        map.add_player(pl);

        return new_ses;
    }
    public override async on_remove_session(sid:number):Promise<void> {

        nat.dbglog.log(debug_level_enum.dle_debug, `worldservice:${this._service_index} on remove session  ${sid}`);

        return super.on_remove_session(sid);
    }
    public override async on_session_close(sid:number):Promise<void> {

        nat.dbglog.log(debug_level_enum.dle_debug, `worldservice:${this._service_index} on session close ${sid}`);
        
        return super.on_session_close(sid);
    }
    protected async _do_clear_session(sid:number):Promise<void> {

        return super._do_clear_session(sid);
    }
    protected override async _do_remove_player(pl:player):Promise<void> {

        // remove player from map
        let plgedata = pl.datas.get_dataobj(generic_playerdata_comp.comp_name);
        if(plgedata != null){

            let map = this._gamemaps.get(plgedata.data.mapid);
            if(map != undefined){
                map.rmv_player(pl);
            }
            else {
                // error
                nat.dbglog.log(debug_level_enum.dle_error, `worldservice:${this._service_index} rmv player mapid:${plgedata.data.mapid} map not exist`);
            }
        }
        else {
            // error
            nat.dbglog.log(debug_level_enum.dle_error, `worldservice:${this._service_index} rmv player uid:${pl.datas.uid}, generic data not exist`);
        }
        
        return super._do_remove_player(pl);
    }

    public override async on_service_task(command:string, data:any):Promise<void> {
        return super.on_service_task(command, data);
    }

    public override async on_broadcast_session_msg(command:string, data:any):Promise<void> {
        return super.on_broadcast_session_msg(command, data);
    }
    public override async on_session_message(sid:number, command:string, data:any):Promise<void> {
        return super.on_session_message(sid, command, data);
    }

    //on_session_rpc_sync(sid:number, cmd:string, data:any):any;

    public override async on_service_update():Promise<void> {

        this._gamemaps.forEach((m)=>{
            m.on_update();
        })

        return super.on_service_update();
    }
}

natrium_services.register("worldservice", worldservice.create);
