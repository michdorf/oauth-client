/** wwApp ajax module ; 22.08.2021 12:30 MD
* COPYRIGHT (C) 2021, AUTONIK AB
* SOURCE	;
*/
export interface Setup {
    method?: "GET" | "POST";
    data?: Data | string;
    withCredentials?: boolean;
    headers?: ObjOfStrings;
    success?: (response: any, request: XMLHttpRequest) => void;
    run?: (response: any) => void;
    complete?: () => void;
    error?: (error: string, xhr: XMLHttpRequest) => void;
    formEncoded?: boolean;
}
interface Data {
    [key: string]: string | object;
}
declare type ObjOfStrings = {
    [key: string]: string;
};
export default function ajax(url: string, setup?: Setup): void;
export {};
