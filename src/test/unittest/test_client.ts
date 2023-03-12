// natrium test
// license : MIT
// author : Sean Chen

import * as path from "node:path";
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

import { protobuf_c2s, protobuf_s2c } from "../../share/msgs/protobufmsgs";
import { natrium_client } from "../../client/natrium_client";
import { packet, prototype } from "../../interface/protocol/packet";

const client:natrium_client = new natrium_client();

let start_client = async () =>{

    await client.init();

    client.connecter?.pcodec.load_protobufs([
        path.resolve(__dirname, "../../../protobuf/share_structure.proto"),
        path.resolve(__dirname, "../../../protobuf/s2c_user.proto"),
        path.resolve(__dirname, "../../../protobuf/c2s_user.proto"),
    ]);

    let pcodec = client.connecter?.pcodec;
    if(pcodec == undefined){
        console.log("client init failed");
        return;
    }

    // register server msg
    pcodec.register_protobuf_msg(protobuf_s2c.login_res, "login_res", "s2c_user.login_res");
    pcodec.register_protobuf_msg(protobuf_s2c.create_player_res, "create_player_res", "s2c_user.create_player_res");
    pcodec.register_protobuf_msg(protobuf_s2c.enter_game_res, "enter_game_res", "s2c_user.enter_game_res");
    pcodec.register_protobuf_msg(protobuf_s2c.player_goto, "player_goto", "s2c_user.player_goto");
    pcodec.register_protobuf_msg(protobuf_s2c.changemap_res, "changemap_res", "s2c_user.changemap_res");
    pcodec.register_protobuf_msg(protobuf_s2c.manul_mine_res, "manul_mine_res", "s2c_user.manul_mine_res");
    
    // register client msg
    pcodec.register_protobuf_msg(protobuf_c2s.login, "login", "c2s_user.login");
    pcodec.register_protobuf_msg(protobuf_c2s.create_player, "create_player", "c2s_user.create_player");
    pcodec.register_protobuf_msg(protobuf_c2s.enter_game, "enter_game", "c2s_user.enter_game");
    pcodec.register_protobuf_msg(protobuf_c2s.goto, "goto", "c2s_user.goto");
    pcodec.register_protobuf_msg(protobuf_c2s.changemap_begin, "changemap_begin", "c2s_user.changemap_begin");
    pcodec.register_protobuf_msg(protobuf_c2s.changemap_end, "changemap_end", "c2s_user.changemap_end");
    pcodec.register_protobuf_msg(protobuf_c2s.manul_mine, "manul_mine", "c2s_user.manul_mine");
    
    client.on("connected", ()=>{
        // on connect, wait shakehand
    });
    client.on("shakehand", ()=>{
        // on shakehand, connection established
        
        testcmd();
    });
    client.on("disconnected", (reason:string)=>{

    });
    client.on("onmsg", (p:packet)=>{
        // on msg
        if(p.prototp == prototype.proto_json || p.prototp == prototype.proto_grpc){
            console.log(JSON.stringify(p.data));
        }

    });

    client.connect("ws://127.0.0.1:4091");
}

start_client();

var testcmd = async ()=>{
    if(client.connecter == null) {
        console.log("Client not initialized");
        return;
    }
    const rl = readline.createInterface({ input, output });
    console.log("Enter test cmd:");
    while(true){
        let cmd = await rl.question("");
        let cmds = cmd?.split(" ");
        
        if(cmds == undefined){
            continue;
        }
    
        switch(cmds[0]){
            case "exit":
                    process.exit(1);
                break;
            case "login":
                {
                    let obj = {
                        c:"login",
                        d:{
                            "name":"BIG",
                            "uid":"1111",
                            "token":"132-12-BIG"
                        }
                    };
    
                    //let pkt = client.connecter.pcodec.create_jsonpkt(obj);
                    let pkt = client.connecter.pcodec.create_protopkt(obj.c, obj.d);
                    client.connecter.send_packet(pkt);
                }
                break;
            case "create_player":
                {
                    let obj = {
                        c:"create_player",
                        d:{}
                    };

                    let pkt = client.connecter.pcodec.create_protopkt(obj.c, obj.d);
                    client.connecter.send_packet(pkt);
                }
                break;
            default:
                console.log("unknown command!");

                break;
        }
    }
}
