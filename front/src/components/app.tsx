import React, { FunctionComponent, useState } from 'react';
import ProgressBar from './progressBar'

export interface JsonTypes {
    done: string;
    progress: string;
    data: Array<string>[];
}

let ips: String = "";
let done: String = "0";
let first_send: Boolean = true;
var data: Array<string>[] = [];

const Counter: FunctionComponent = ({ }) => {

    const [dataToTable, setDataToTable] = useState([]);
    const [buttonCheckDisable, setButtonCheckDisable] = useState(true);
    const [buttonDownloadDisable, setButtonDownloadDisable] = useState(true);
    const [portInputDisable, setPortInputDisable] = useState(false);
    const [port, setPort] = useState("25565");
    const [scanProgress, setScanProgress] = useState(String("Paste IP List and start check"));
    const [progress, setProgress] = useState(String(""));

    function check() {
        setDataToTable([])
        setScanProgress("Scan progress: 0%   Online servers count: 0   All servers count: 0")
        setProgress(String(""))
        sendToBackend()
    }

    function sendToBackend() {
        if (ips.length > 0 && !buttonCheckDisable) {
            setButtonCheckDisable(true)
            setButtonDownloadDisable(true)
            setPortInputDisable(true)
            const intervalId = setInterval(() => {
                if (done == "0") {
                    var second_req = {
                        method: "GET", df: "w"
                    }
                    var first_req = {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ "mode": "set_data", "port": port, "ips": ips.split("\n") })
                    }
                    fetch("http://127.0.0.1:8080/api", first_send ? first_req : second_req)
                        .then(res => res.json())
                        .then(res => updateData(res))
                    first_send = false
                }
                else {
                    setButtonCheckDisable(false)
                    setButtonDownloadDisable(false)
                    setPortInputDisable(false)
                    done = "0"
                    first_send = true
                    clearInterval(intervalId)
                }
            }, 1000);
        }
    }

    function updateData(res: JsonTypes) {
        done = res.done
        setProgress(res.progress)
        data = res.data
        var datatot: Array<string>[] = [];
        var onlineDataCount = 0
        data.forEach(element => {
            if (element[0] == "Online") {
                onlineDataCount++
                var strArr: Array<string>;
                strArr = [onlineDataCount.toString(), element[1], element[2], stringLength(element[3], 10, true),
                stringLength(element[4], 4, true), stringLength(element[5], 4, true), stringLength(element[6], 20, true), stringLength(element[7], 4, true)];
                datatot.push(strArr)
            }
        });
        console.log(datatot)

        if (datatot.length != 0) {
            if (datatot.length > 30) {
                setDataToTable(datatot.slice(datatot.length-30))
            }
            else {
                setDataToTable(datatot)
            }
        }
        if (res.progress == "100.0")
            setScanProgress("Scaning is completed! " + String(data.length) + " results.")
        else setScanProgress("Scan progress: " + res.progress + "%   Online servers count: " + onlineDataCount + "   Servers count: " + String(data.length))
    }

    function stringLength(str: string, length: number, bool: boolean): string {
        var str2: string = ""
        if (bool) {
            if (str.length < (length + 2)) {
                while (str2.length < (length - str.length + 2)) str2 += " "
                str2 = str + str2
            } else {
                str2 += str.slice(0, length) + ".."
            }
        }
        else {
            if (str.length < (length)) {
                while (str2.length < (length - str.length)) str2 += " "
                str2 = str + str2
            } else {
                str2 += str.slice(0, length)
            }
        }
        return str2
    }

    function dataToFile() {
        var currentdate = new Date();
        var datetime = currentdate.getDate() + "/"
            + (currentdate.getMonth() + 1) + "/"
            + currentdate.getFullYear() + "  "
            + currentdate.getHours() + ":"
            + currentdate.getMinutes() + ":"
            + currentdate.getSeconds();

        var csvFile = "Status;IP;Port;Version;Players now;Players max;Ping;Description\n"
        data.forEach(e => {
            if (e[0] == "Offline")
                csvFile += e[0] + ";" + e[1] + ";" + e[2] + ";" + "" + ";" + "" + ";" + "" + ";" + "" + ";" + "" + "\n"
            else
                csvFile += e[0] + ";" + e[1] + ";" + e[2] + ";" + e[3].replace(/;|\n/g, '') + ";" + e[4] + ";" + e[5] + ";" + e[7] + ";" + e[6].replace(/;|\n/g, '') + "\n"
        });
        csvFile += datetime + ";Count: " + data.length + ";;;;;"
        return csvFile
    }

    function download() {
        if (!buttonDownloadDisable) {
            var url = window.URL.createObjectURL(new Blob([dataToFile()], { type: 'text/plain' }));
            var anchor = document.createElement("a");
            anchor.href = url;
            anchor.download = "Minecraft Servers List.csv";
            anchor.click();
            window.URL.revokeObjectURL(url);
        }
    }

    function setPortValue(newPort: string) {
        const re = /^[0-9\b]+$/
        if (newPort === '' || re.test(newPort) && parseInt(newPort) > 0 && parseInt(newPort) < 65536 && newPort.charAt(0) != '0') {
            setPort(newPort)
            if (ips.length == 0 || newPort.length == 0) setButtonCheckDisable(true)
            else setButtonCheckDisable(false)

        }
        else setButtonCheckDisable(false)
    }

    return <div>
        <p className="header"> Check Minecraft Servers Ruby version</p>
        <div className="styled-input">
            <textarea required onChange={(event) => {
                ips = event.target.value
                if (ips.length > 0) {
                    setButtonCheckDisable(false)
                }
                else {
                    setButtonCheckDisable(true)
                }
            }} />
            <label>Paste IP List</label>
        </div>
        <p className="portText">Port</p>
        <div className="port-block">
            <div className="styled-input port-input">
                <input type="text" required disabled={portInputDisable} value={port} onChange={(event) => {
                    setPortValue(event.target.value)
                }}></input>
            </div>
        </div>
        <div>
            <a className={buttonCheckDisable ? "animated-button disabled" : "animated-button enabled check"} onClick={check}>Check</a>
        </div>
        <div>
            <a className={buttonDownloadDisable ? "animated-button disabled" : "animated-button enabled"} onClick={download}>Download results</a>
        </div>
        <div>
            <p>{scanProgress}</p>
            <ProgressBar progress={progress}></ProgressBar>
            <table >
                <thead>
                    <tr>
                        <th>№</th>
                        <th>IP</th>
                        <th>Port</th>
                        <th>Version</th>
                        <th>Now</th>
                        <th>Max</th>
                        <th>Ping</th>
                        <th>Description</th>
                    </tr>
                </thead>
                <tbody>
                    {dataToTable.map((server) => (
                        <tr>
                            <td>{server[0]}</td>
                            <td>{server[1]}</td>
                            <td>{server[2]}</td>
                            <td>{server[3]}</td>
                            <td>{server[4]}</td>
                            <td>{server[5]}</td>
                            <td>{server[7]}</td>
                            <td>{server[6]}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
}

export default Counter;