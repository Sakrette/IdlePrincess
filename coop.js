let _info = {};
let INFO = {};
let RANKS = {};
let FAIRIES = {};
let FAIRIES_UNORDERED = {};
let MODE = {TRIGGER:[], COND:()=>{return [3,23,5]}, SP:false};
let DAILY = {};
let REFERENCE = {};
let NOW = {};
let VALID = {};
let LINKROOT = "https://dl.dropbox.com/s/gzov7s0v925j5o9/"
let FairiesJson = "fairies.json";

let DATETIME = {
    MILLIS : 1,
    SECOND : 1000,
    MINUTE : 1000 * 60,
    HOUR   : 1000 * 60 * 60,
    DAY    : 1000 * 60 * 60 * 24,
    getDelta(date1, date2, unit=DATETIME.DAY, floor=true) {
        let delta = (date2.getTime() - date1.getTime()) / unit; 
        if (floor) {
            return Math.floor(delta);
        } else {
            return delta;
        }
    },
};

window.onload = () => {
    globalSetup();
    setup();   
}



function globalSetup(){
    _info = document.body.getElementsByTagName("info")[0].attributes;
    new Array(_info.length).fill(0).forEach((i, idx) => {
        INFO[_info[idx].name] = _info[idx].value;
    });
}

function setup(){
    NOW = setup_datetime(datetime_year, datetime_month, datetime_date, datetime_hour);

    loadFile(LINKROOT + FairiesJson,
        resp => {
            msg.innerText = "";
            let jdata = JSON.parse(resp.content);
            setup_ranks(fairyrank, jdata.ranks);
            RANKS = jdata.ranks;
            FAIRIES = jdata.fairies;
            FAIRIES_UNORDERED = jdata.fairies_unordered;
            DAILY = jdata.daily; // RARE: [*ids]

            setup_fairies(fairyname, FAIRIES);
            REFERENCE = jdata.reference;

            VALID = REFERENCE.until;
            valid_year.innerText  = VALID.year;
            valid_month.innerText = ("0"+VALID.month).slice(-2);
            valid_date.innerText  = ("0"+VALID.date ).slice(-2);
            valid_hour.innerText  = ("0"+VALID.hour ).slice(-2);

            git_update_time.innerText = INFO.updatetime;
            if (jdata.git_update_datetime != INFO.updatetime) git_update_time.innerText += " (最新版本為" + jdata.git_update_datetime + ")"
            data_update_time.innerText = "資料更新時間：" + jdata.update_datetime;
        });
}

function settime_now(y, m, d, h) {
    let now = NOW;
    // year
    y.value = now.year;
    // month
    m.value = now.month;
    // date
    d.value = now.date;
    // hours
    h.value = now.hour;

    return now;
}

function setup_datetime(y, m, d, h, datetime) {
    datetime = datetime || new Date();
    datetime.setHours(datetime.getHours() + datetime.getTimezoneOffset()/60 + 8); // TW is UTC+8

    let now = {
        year: datetime.getFullYear(),
        month: datetime.getMonth() + 1,
        date: datetime.getDate(),
        hour: datetime.getHours(),
    };
    // year
    addOption(y, now.year);
    addOption(y, now.year+1);
    y.value = now.year;
    // month
    for (var mn=1; mn<=12; mn++)
        addOption(m, mn);
    m.value = now.month;
    // date
    for (var dt=1; dt<=31; dt++)
        addOption(d, dt);
    d.value = now.date;
    // hours
    for (var hr=0; hr<=23; hr++)
        addOption(h, hr);
    h.value = now.hour;

    return now;
}

function setup_ranks(el, jsondata) {
    jsondata["All"] = 0;
    Object.keys(jsondata).sort((a,b)=>jsondata[a]-jsondata[b])
        .forEach(rank => {
            addOption(el, jsondata[rank], rank);
    });
    el.value = jsondata["All"];
}


function setup_fairies(el, jsondata, rank="All") {
    addOption(el, -1, rank, rank);
    Object.values(jsondata).forEach(fairy => {
        addOption(el, fairy.id, fairy.alias, rank=="All" || fairy.rank==rank);
    });
    el.value = -1;
}
function reset_fairies(fr, fn) {
    if (MODE.SP) trigger_mode();
    while (fn.firstChild != null) {
        fn.removeChild(fn.firstChild);
    }
    setup_fairies(fn, FAIRIES, fr.children[fr.value].text);
}
function reset_as_unordered_fairies() {
    if (MODE.SP) {
        let fn = fairyname;
        while (fn.firstChild != null) {
            fn.removeChild(fn.firstChild);
        }

        Object.keys(FAIRIES_UNORDERED).forEach(key => {
            addOption(fn, key, FAIRIES_UNORDERED[key].alias, true);
        });

        result_title.innerText = "(SP MODE)";
        result.innerText = "";
        check_mode();
    }
}
function check_mode() {
    if (MODE.SP) {
        let fairy = FAIRIES_UNORDERED[fairyname.value];
        fairyImg.style.display = "block";
        fairyImg.src = ""; // clear first
        fairyImg.src = `https://dl.dropbox.com/s/${fairy.imgid}/PartyRaid_${fairyname.value}.png`;    
    }
}
function trigger_mode(reset=false) {
    if (!reset && !MODE.SP) {
        let cond = MODE.COND();
        if (fairyrank.value==cond[0] && fairyname.value==cond[1]) {
            if (ignoreValid.checked) {
                MODE.TRIGGER[2] = (MODE.TRIGGER[2] || 0) + 1;
                if (MODE.TRIGGER[2]==cond[2]) {
                    MODE.SP = true;
                    reset_as_unordered_fairies();
                }
            }
            return;
        }
    } else {
        MODE.SP = false;
        MODE.TRIGGER.splice(0);
        if (!reset) { // extra call
            fairyImg.style.display = "none";
            result_title.innerText = "";
            result.innerText = "";
            reset_fairies(fairyrank, fairyname);
        }
    }
}


function search() {
    if (MODE.SP) return;
    trigger_mode(true);
    if (fairyname.value==-1) return searchRank(fairyrank.children[fairyrank.value].text);

    let fairycount = Object.keys(FAIRIES).length;

    let RefFairyId = FAIRIES[(REFERENCE.fairy-1+fairycount) % fairycount + 1].id;
    let datetime = new Date(REFERENCE.datetime.year, REFERENCE.datetime.month-1, REFERENCE.datetime.date, REFERENCE.datetime.hour - (RefFairyId-1)); // reference datetime - offset
    datetime.setHours(datetime.getHours() + (fairyname.value - 1)); // first time after REFERENCE

    let fromtime = new Date(datetime_year.value, datetime_month.value-1, datetime_date.value, datetime_hour.value);
    let validtime = new Date(VALID.year, VALID.month-1, VALID.date, VALID.hour);

    // get first from fromtime
    datetime.setHours(datetime.getHours() + Math.ceil(DATETIME.getDelta(datetime, fromtime, DATETIME.HOUR) / fairycount) * fairycount);

    let fairy = FAIRIES[fairyname.value];
    result_title.innerText = fairy.rank + " " + fairy.alias;
    fairyImg.style.display = "block";
    fairyImg.src = ""; // clear first
    fairyImg.src = `https://dl.dropbox.com/s/${fairy.imgid}/PartyRaid_${fairy.name}.png`;
    //msg.innerText = fairyImg.src;

    result.innerText = "限時：";
    for (let count=1, flag=false; count<=display_count.value; count++, datetime.setHours(datetime.getHours() + fairycount)){
        if (datetime>validtime) { // 超過維修時間，會不準
            if (!ignoreValid.checked) {
                break;
            } else if (!flag) {
                result.innerText += "\n" + "========== 超過維修時間部分可能不準 ==========";
                flag = true;
            }
        }


        let datetimeData = {
            year: datetime.getFullYear(),
            month: datetime.getMonth() + 1,
            date: datetime.getDate(),
            hour: datetime.getHours(),
        };
        result.innerText += "\n" + count + ". " 
                        + datetimeData.year + "/"
                        + ("0"+datetimeData.month).slice(-2) + "/"
                        + ("0"+datetimeData.date).slice(-2)  + " "
                        + ("0"+datetimeData.hour).slice(-2)  + ":00";
    }


    // full day
    let DailyList = DAILY[fairy.rank];
    let fairylen_full = DailyList.length;
    let fairyId_full = DailyList.indexOf(fairy.id);
    let datetime_full = new Date(REFERENCE.datetime.year, REFERENCE.datetime.month-1, REFERENCE.datetime.date + 1); // reference datetime + 1 = first fairy
    datetime_full.setDate(datetime_full.getDate() + fairyId_full); // first time after REFERENCE
    let fromtime_full = new Date(datetime_year.value, datetime_month.value-1, datetime_date.value);
    let validtime_full = new Date(VALID.year, VALID.month-1, VALID.date);

    // get first from fromtime
    datetime_full.setDate(datetime_full.getDate() + Math.ceil(DATETIME.getDelta(datetime_full, fromtime_full, DATETIME.DAY) / fairylen_full) * fairylen_full);

    result.innerText += "\n\n 全日：";
    for (let count=1, flag=false; count<=display_count.value; count++, datetime_full.setDate(datetime_full.getDate() + fairylen_full)){
        if (datetime_full>validtime_full) { // 超過維修時間，會不準
            if (!ignoreValid.checked) {
                break;
            } else if (!flag) {
                result.innerText += "\n" + "========== 超過維修時間部分可能不準 ==========";
                flag = true;
            }
        }


        let datetimeData = {
            year: datetime_full.getFullYear(),
            month: datetime_full.getMonth() + 1,
            date: datetime_full.getDate()
        };
        result.innerText += "\n" + count + ". " 
                        + datetimeData.year + "/"
                        + ("0"+datetimeData.month).slice(-2) + "/"
                        + ("0"+datetimeData.date).slice(-2);
    }
}

function searchRank(rank) {
    fairyImg.style.display = "none";

    let fairies = Object.values(FAIRIES).filter(fairy => rank=="All" || fairy.rank==rank);
    let fairiesLen = fairies.length;
    let deltatimes = [fairies[0].id - 1];
    for (var fid=1; fid<fairiesLen; fid++) {
        deltatimes.push(fairies[fid].id - fairies[fid-1].id);
    }
    let fairycount = Object.keys(FAIRIES).length;
    deltatimes.push(fairies[0].id + fairycount - fairies[fairiesLen-1].id);

    let RefFairyId = FAIRIES[(REFERENCE.fairy-1+fairycount) % fairycount + 1].id;
    let datetime = new Date(REFERENCE.datetime.year, REFERENCE.datetime.month-1, REFERENCE.datetime.date, REFERENCE.datetime.hour - (RefFairyId-1)); // reference datetime - offset
    let fromtime = new Date(datetime_year.value, datetime_month.value-1, datetime_date.value, datetime_hour.value);
    let validtime = new Date(VALID.year, VALID.month-1, VALID.date, VALID.hour);

    // get first from fromtime
    datetime.setHours(datetime.getHours() + Math.ceil(DATETIME.getDelta(datetime, fromtime, DATETIME.HOUR) / fairycount) * fairycount);

    datetime.setHours(datetime.getHours() - fairycount + deltatimes[0]); // first filtered fairy
    deltatimes[0] = deltatimes.pop(); // last is the actual delta time for the first fairy

    result_title.innerText = "[" + rank + "]";
    result.innerText = "限時：";
    for (var fid=0, count=0, flag=false; count<display_count.value;){
        if (datetime>validtime) { // 超過維修時間，會不準
            if (!ignoreValid.checked) {
                break;
            } else if (!flag) {
                result.innerText += "\n" + "========== 超過維修時間部分可能不準 ==========";
                flag = true;
            }
        }


        if (datetime >= fromtime) {
            count++;
            let fairy = fairies[fid];
            let datetimeData = {
                    year: datetime.getFullYear(),
                    month: datetime.getMonth() + 1,
                    date: datetime.getDate(),
                    hour: datetime.getHours(),
                };
            result.innerText += "\n" + count + ". " 
                             + datetimeData.year + "/"
                             + ("0"+datetimeData.month).slice(-2) + "/"
                             + ("0"+datetimeData.date).slice(-2)  + " "
                             + ("0"+datetimeData.hour).slice(-2)  + ":00 "
                             + fairy.rank + " " + fairy.alias;
        }
        fid = (fid+1)%fairies.length;
        datetime.setHours(datetime.getHours() + deltatimes[fid]);
    }


    // full day
    let RankList = Object.keys(DAILY).sort((a,b)=>(RANKS[a]-RANKS[b]));
    let DailyList = {};
    if (rank=="All") {
        RankList.forEach(r => {
            DailyList[r] = {"list": [...DAILY[r]]};
        })
    } else {
        DailyList[rank] = {"list": [...DAILY[rank]]};
    }
    RankList = RankList.filter(r => DailyList[r]!=null);

    let datetime_full = new Date(REFERENCE.datetime.year, REFERENCE.datetime.month-1, REFERENCE.datetime.date + 1); // reference datetime + 1 = first fairy
    let fromtime_full = new Date(datetime_year.value, datetime_month.value-1, datetime_date.value);
    let validtime_full = new Date(VALID.year, VALID.month-1, VALID.date);

    let date_delta = DATETIME.getDelta(datetime_full, fromtime_full, DATETIME.DAY);

    RankList.forEach(r=> {
        DailyList[r]["now"] = date_delta % DailyList[r]["list"].length;
    });

    datetime_full.setTime(fromtime_full.getTime()); // set to fromtime

    result.innerText += "\n\n 全日：";

    for (var count=1, flag=false; count<=display_count.value; count++, datetime_full.setDate(datetime_full.getDate() + 1)){
        if (datetime_full>validtime_full) { // 超過維修時間，會不準
            if (!ignoreValid.checked) {
                break;
            } else if (!flag) {
                result.innerText += "\n" + "========== 超過維修時間部分可能不準 ==========";
                flag = true;
            }
        }

        let datetimeData = {
            year: datetime_full.getFullYear(),
            month: datetime_full.getMonth() + 1,
            date: datetime_full.getDate()
        };
        result.innerText += "\n" + count + ". " 
                        + datetimeData.year + "/"
                        + ("0"+datetimeData.month).slice(-2) + "/"
                        + ("0"+datetimeData.date).slice(-2);

        RankList.forEach(r => {
            result.innerText += (rank=="All"? "\n    " + r: "") + " " + FAIRIES[DailyList[r]["list"][DailyList[r]["now"]]].alias;
            DailyList[r]["now"] = (DailyList[r]["now"] + 1) % DailyList[r]["list"].length;
        });
    }

}





// option
function addOption(parent, value, text, enable=true) {
    if (!enable) return;
    if (text==null) text = value;
    let opt = document.createElement("option");
        parent.appendChild(opt);
        opt.value = value;
        opt.innerText = text;
}


// load online file
function loadFile(url, callback, ...args){
    let LINK = {
        src: url,
        content: null,
        loaded: false,
        result: null,
    };
    loadingMessages(LINK, url);
    loadText(LINK, ()=>{
        LINK.result = callback(LINK, ...args);
    });
}


function loadText(request, ...action){
    function stop(){
        request.loaded = true;
        msg.innerText = "Error: Can not read source file: " + request.src;
    }
    if(["data", "http","https","chrome"].indexOf(request.src.split("://")[0])<0) return stop();

    let txtFile = new XMLHttpRequest();
    try{
        txtFile.open("GET", request.src, true);
    }catch(e){
        stop();
        return;
    }

    txtFile.onreadystatechange = () => {
        if(txtFile.readyState !== 4)
            return;
        // Makes sure the document is ready to parse.
        if(txtFile.status !== 200){
            if(txtFile.status === 0)
                stop();
            return;
        }
        // Makes sure it's found the file.
        request.content = txtFile.responseText;
        request.loaded = true;

        action.map(a=>a());// do all actions
    }
    txtFile.send(null);
}

function loadingMessages(loader, filename=""){
    msg.innerText = "Loading " + filename.split("/").slice(-1)[0];
    var loading = setInterval(()=>{
        if(loader.loaded)
            clearInterval(loading);
        else
            msg.innerText += ".";
    }, 300);
}
