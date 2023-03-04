// natrium
// license : MIT
// author : Sean Chen

export interface session {

    readonly session_id:number;
    readonly session_key:string;

    readonly service_name:string;
    readonly service_index:number;

    set_service(service_name:string, service_index:number):void;
}