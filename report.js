/** GETパラメータの値 */
var args = null;

/** GASから取得した設定情報
 * @property {string}  title                     - 会議名称
 * @property {string}  version                   - アプリバージョン
 * @property {string}  app_mode                  - アプリ動作モード（動作確認 or 本番）
 * @property {string}  mode                      - アプリ起動モード（会議受付 or 懇親会受付）
 * @property {object}  info_message              - アプリ更新履歴
 * @property {string}  pass                      - アプリ起動用パスワード
 * @property {string}  date                      - 会議日程（yyyy/mm/dd）
 * @property {string}  date_jp                   - 会議日程（yyyy年mm月dd日）
 * @property {string}  venue_meeting             - 会議の会場名称
 * @property {string}  meeting_time              - 会議開始時刻（hh:mm）
 * @property {string}  seating_chart_meeting     - 会議会場の座席画像URL
 * @property {string}  venue_gathering           - 懇親会の会場名称
 * @property {string}  gathering_time            - 懇親会開始時刻（hh:mm）
 * @property {string}  seating_chart_gathering   - 懇親会会場の座席画像URL
 * @property {string}  mail_from                 - メール宛先
 * @property {object}  no_send_mail_dept         - 非メール送信対象の所属
 */
var SETTING_DATA = {};

/** GASから取得した社員情報一覧
 * @property {string}  row_no     - スプレッドシート登録行番号
 * @property {string}  company    - 会社名
 * @property {string}  user_no    - 社員番号
 * @property {string}  name       - 氏名漢字
 * @property {string}  kana       - 氏名カナ
 * @property {string}  dept       - 所属
 * @property {string}  mail       - メールアドレス
 * @property {string}  meeting    - 事前出欠有無（会議）
 * @property {string}  social_gathering   - 事前出欠有無（懇親会）
 * @property {string}  seat_meeting       - 座席番号（会議）
 * @property {string}  seat_gathering     - 座席番号（懇親会）
 */
var EMPLOYEE_INFO = new Map();

/** リロード時のGET化対策：通信キャンセル用コントローラー */
var fetchController = null;

/** GASのURL送信時に送るパラメータ */
const sendParamSetting = { action: 'getSettingData' };
// var sendParamMeeting = { action: 'updateMeeting' };
// var sendParamgathering = { action: 'updategathering' };


// DOM要素の取得
// var containor = HTMLElement;
// var video = HTMLElement;
// var canvas = HTMLElement;

// var placeholder = HTMLElement;
// var cameraStatusText = HTMLElement;

// var modeQr = HTMLElement;
// var modeManual = HTMLElement;

// var btnModeQr = HTMLElement;
// var btnModeManual = HTMLElement;

// var iconQr = HTMLElement;
// var iconManual = HTMLElement;

// var scanTarget = HTMLElement;
// var manualInput = HTMLElement;
// var submitBtn = HTMLElement;
// var clearBtn = HTMLElement;
// var toast = HTMLElement;

// /** 設定データ取得待ちのポップアップ通知 */
// var toastDataWait = HTMLElement;
// /** 起動時インフォメーションのポップアップ通知 */
// var toastAppInfo = HTMLElement;
// var btnAppInfoClose = HTMLElement;
// /** エラー時のポップアップ通知 */
// var toastError = HTMLElement;
// /** 不正QRコードの場合のメッセージ */
// var qrErrMessage = HTMLElement;

var kanaInput = HTMLElement;
var suggestionList = HTMLElement;
var nameSelect = HTMLElement;
var deptSelect = HTMLElement;
var meetingStatus = HTMLElement;
var timeInput = HTMLElement;
var timeSuffix = HTMLElement;
var timeLabel = HTMLElement;





/** 画面ロード時の処理 */
window.onload = async function() {
    // 💡ページを離れる/リロードする直前にリクエストを強制切断（GET化の残骸防止）
    window.onbeforeunload = () => {
        if (fetchController) fetchController.abort();
    };

    // DOM要素の取得
    containor = document.getElementById('containor');

    // placeholder = document.getElementById('camera-placeholder');
    // cameraStatusText = document.getElementById('camera-status-text');

    // modeQr = document.getElementById('mode-qr');
    // modeManual = document.getElementById('mode-manual');

    // btnModeQr = document.getElementById('btn-mode-qr');
    // btnModeManual = document.getElementById('btn-mode-manual');

    // iconQr = document.getElementById('icon-container-qr');
    // iconManual = document.getElementById('icon-container-manual');

    // scanTarget = document.getElementById('scan-target');
    // manualInput = document.getElementById('manual-input');
    // submitBtn = document.getElementById('submit-btn');
    // clearBtn = document.getElementById('clear-btn');
    // toast = document.getElementById('toast');

    /** 設定データ取得待ちのポップアップ通知 */
    toastDataWait = document.getElementById('toast-getData-wait');
    /** エラー時のポップアップ通知 */
    toastError = document.getElementById('toast-error');


    // GETパラメータの取得
    args = getArguments();

    // GETパラメータの判定①
    if (!checkArguments(args)) {
        showToastError(
            'このアドレスは無効、またはアクセス権限がありません。'
            ,false
        );
        return false;
    }

    // 設定データ取得待ちの表示
    clearTimeout(toastTimeout);
    toastDataWait.classList.remove('translate-y-20', 'hidden', 'pointer-events-none');
    toastDataWait.classList.add('translate-y-0', 'opacity-100');

    try {
        // 設定データ＆社員情報一覧の取得
        console.groupCollapsed('設定データ＆社員情報一覧の取得');
        let data = await getFetchData(GAS_URL, sendParamSetting);

        // 取得結果
        SETTING_DATA = data.settingData;
        SETTING_DATA.mode = args.mode_jp;
        console.table(SETTING_DATA);

        // 初期化時に社員配列を「かな氏名」をキーにハッシュテーブルに変換する
        if (Array.isArray(data.employeeInfo)) {
            EMPLOYEE_INFO = new Map(data.employeeInfo.map(emp => [String(emp.kana), emp]));
        }
        console.table(EMPLOYEE_INFO);
        console.groupEnd('設定データ＆社員情報一覧の取得');

    } catch (fetchError) {
        showToastError(
            '設定データの取得に失敗しました。<br>' + fetchError
            ,false
        );
        return false;
    }

    // データ取得完了後に、設定データ取得待ちを隠す
    toastDataWait.classList.remove('translate-y-0', 'opacity-100');
    toastDataWait.classList.add('hidden');

    // GETパラメータの判定②
    if (!checkParameter(args)) {
        showToastError(
            'このアドレスは無効、またはアクセス権限がありません。'
            ,false
        );
        return false;
    }

    // メイン部分を表示
    containor.classList.remove('hidden');
    containor.classList.add('opacity-100');



    // 各入力域のDOM要素取得
    kanaInput = document.getElementById('kana-input');
    suggestionList = document.getElementById('suggestion-list');
    nameSelect = document.getElementById('name-select');
    deptSelect = document.getElementById('dept-select');
    meetingStatus = document.getElementById('meeting-status');
    timeInput = document.getElementById('time-input');
    timeSuffix = document.getElementById('time-suffix');
    timeLabel = document.getElementById('time-label');

    // フォーカスがあたった瞬間にリストを表示（全件、または入力中の文字で絞り込み）
    kanaInput.addEventListener('focus', updateSuggestions);

    // 文字入力時にもリストをリアルタイムに更新
    kanaInput.addEventListener('input', updateSuggestions);

    // エンターキーによる誤送信を防止
    kanaInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.isComposing) {
            e.preventDefault(); // フォームのsubmit等のデフォルト挙動を阻止
        }
    });

    // 候補リストクリック時の選択・連動処理
    suggestionList.addEventListener('click', (e) => {
        const clickedItem = e.target.closest('li[data-kana]');
        if (!clickedItem) return;

        const targetKana = clickedItem.getAttribute('data-kana');
        const selectedMember = EMPLOYEE_INFO.get(targetKana);
        console.log(targetKana);
        console.table(selectedMember);



        if (selectedMember) {
            // 入力欄に値をセット
            kanaInput.value = selectedMember.kana;
            
            // 氏名と所属に反映
            nameSelect.innerHTML = `<option value="${selectedMember.name}" selected>${selectedMember.name}</option>`;
            deptSelect.innerHTML = `<option value="${selectedMember.dept}" selected>${selectedMember.dept}</option>`;
            
            // スタイルをアクティブカラーに変更
            nameSelect.classList.remove('text-slate-500');
            nameSelect.classList.add('text-slate-100');
            deptSelect.classList.remove('text-slate-500');
            deptSelect.classList.add('text-slate-100');
        }
        suggestionList.classList.add('hidden');
    });

    // 枠外をクリックしたら候補リストを閉じる
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#autocomplete-wrapper')) {
            suggestionList.classList.add('hidden');
        }
    });

    meetingStatus.addEventListener('change', handleMeetingStatusChange);


    // 会議欄の切り替え制御
    handleMeetingStatusChange();

    console.log('アプリ起動完了');
}
/** GETパラメータの取得 */
function getArguments() {
    // GETパラメータの取得
    console.groupCollapsed('GETパラメータの取得');
    const params = new URLSearchParams(window.location.search);

    // 取得結果
    console.table({
        mode: params.get('mode')
        ,mode_jp: params.get('mode')
        ,date: params.get('date')
    });
    console.groupEnd('GETパラメータの取得');

    return {
        mode: params.get('mode')
        ,mode_jp: params.get('mode')
        ,date: params.get('date')
    };
}
/** GETパラメータの判定① */
function checkArguments(_params) {
    // modeの値がnullまたは空白
    if (_params.mode === null || _params.mode === '') {
        console.error('GETパラメータ不正：modeの値がnullまたは空白');
        return false;
    }

    // modeの値が規定値以外
    switch (_params.mode) {
        case 'recep':
            _params.mode_jp = '会議受付';
            break;
        case 'gathering':
            _params.mode_jp = '懇親会受付';
            break;
        default:
            _params.mode_jp = 'ｘｘｘ';
            console.error('GETパラメータ不正：modeの値が規定値以外');
            return false;
            break;
    }

    // modeの値が「report」でdateの値がnull
    if (_params.date === null) {
        console.error('GETパラメータ不正：dateの値がnull');
        return false;
    }

    // 戻り値
    return true;
}
/** URLFetchを実行しデータを取得する */
async function getFetchData(_url, _param) {
    try {
        // 💡リロード対策：既存の未完了リクエストがあれば切断
        if (fetchController) { fetchController.abort(); }
        fetchController = new AbortController();

        console.log('getFetchData:', _url);
        const response = await fetch(
                                    _url
                                    ,{
                                        method: "POST"
                                        ,signal: fetchController.signal
                                        ,headers: {"Content-Type": "text/plain"}
                                        ,body: JSON.stringify(_param)
                                    }
                                );
        const data = await response.json();
        if (data.status === "success") {
            // GAS処理成功
            console.log('URLFetch正常終了');
            return data;
        } else {
            // GAS処理失敗
            console.error('URLFetch呼び出し先でエラー発生：', data);
            throw new Error(data.message);
        }
    } catch (error) {
        // GAS処理呼び出しに失敗
        console.error('URLFetch呼び出しに失敗：', error);
        throw new Error(error.message);
    }
}
/** GETパラメータの判定② */
function checkParameter(_params) {
    // dateの値がnull以外、かつ設定情報のdateの値と相違
    if (_params.date !== null && _params.date !== SETTING_DATA.date.replaceAll('/', '')) {
        console.error('GETパラメータ不正：dateの値が相違');
        return false;
    }

    // 戻り値
    return true;
}
/** 設定情報画面描画 */
function drawSettingData(_data) {
    const mode = document.getElementById('mode-name');
    const datetime = document.getElementById('appli-datetime');
    const venue = document.getElementById('appli-venue');

    mode.innerText = _data.mode;
    datetime.innerText = _data.date;
    switch(_data.mode) {
        case '会議受付':
            datetime.innerText += ' ' + _data.meeting_time;
            venue.innerText = _data.venue_meeting;
            break;
        case '懇親会受付':
            title.innerText = _data.mode.replace('受付','') + '[QR]';
            datetime.innerText += ' ' + _data.gathering_time;
            venue.innerText = _data.venue_gathering;
            break;
    }
}

let toastTimeout;
/** 受付完了時ポップアップ通知の表示 */
function showToastSuccess(_message, _seat) {
    clearTimeout(toastTimeout);
    
    let timer = 3000;
    const toastMessage = document.getElementById('toast-message');
    const toastSeat = document.getElementById('toast-seat');
    toastMessage.innerHTML = _message;
    if (!_seat || _seat === '') {
        // 座席が未指定の場合
        _seat = '運営に確認<br/>※事前欠席→参加';
        timer = 6000;
    }
    toastSeat.innerHTML = '座席： ' + _seat;

    // 表示
    toast.classList.remove('translate-y-20', 'hidden', 'pointer-events-none');
    toast.classList.add('translate-y-0', 'opacity-100');
    playBeep(true);

    // 3秒後に隠す
    toastTimeout = setTimeout(() => {
        toast.classList.remove('translate-y-0', 'opacity-100');
        toast.classList.add('translate-y-20', 'hidden', 'pointer-events-none');
    }, timer);
}
/** エラー時ポップアップ通知の表示 */
function showToastError(_message, _autoClose = true) {
    clearTimeout(toastTimeout);

    // エラーメッセージ
    const toastErrorMessage = document.getElementById('toast-error-message');
    toastErrorMessage.innerHTML = _message;

    // トースト表示アニメーション
    toastError.classList.remove('translate-y-20', 'hidden', 'pointer-events-none');
    toastError.classList.add('translate-y-0', 'opacity-100');

    // _autoCloseがtrueの場合、何もしなくても30秒後に隠す
    if (_autoClose) {
        toastTimeout = setTimeout(() => {
            // エラー時のポップアップ通知を隠す
            toastError.classList.remove('translate-y-0', 'opacity-100');
            toastError.classList.add('hidden');
        }, 30000);
    }
}






// 2. リスト描画の共通処理（空文字なら全件表示、文字があれば絞り込み）
function updateSuggestions() {
    // 入力がない場合は全件、ある場合は部分一致でフィルタリング
    const query = kanaInput.value.trim().toLowerCase();
    const filtered = query 
        ? Array.from(EMPLOYEE_INFO.entries()).filter(([key]) => key.includes(query))
        : Array.from(EMPLOYEE_INFO.entries());

    if (filtered.length > 0) {
        suggestionList.innerHTML = filtered.map(member => `
            <li class="px-4 py-2.5 hover:bg-slate-800 text-sm text-slate-200 cursor-pointer transition-colors border-b border-slate-900/50 last:border-0" 
            data-row-no="` + member[1].row_no + `" 
            data-user-no="` + member[1].user_no + `" 
            data-user-dept="` + member[1].dept + `" 
            data-kana="` + member[1].kana + `" 
            data-user-name="` + member[1].name + `" 
            data-mail-to="` + member[1].mail + `" 
            data-jizen-meeting="` + member[1].meeting + `" 
            data-jizen-gathering="` + member[1].social_gathering + `" 
            data-seat-meeting="` + member[1].seat_meeting + `" 
            data-seat-gathering="` + member[1].seat_gathering + `" 
            >
                <div class="font-medium">` + member[1].kana + `</div>
                <div class="text-xs text-slate-500">` + member[1].name + ` ［` + member[1].dept + `］</div>
            </li>
        `).join('');
        suggestionList.classList.remove('hidden');
    } else {
        suggestionList.innerHTML = `<li class="px-4 py-3 text-sm text-slate-600 text-center">該当する候補がいません</li>`;
        suggestionList.classList.remove('hidden');
    }
}

// 3. 遅刻・欠席の表示制御
function handleMeetingStatusChange() {
    if (meetingStatus.value === '遅刻') {
        timeInput.disabled = false;
        timeSuffix.style.opacity = '1';
        timeLabel.classList.remove('text-slate-600');
        timeLabel.classList.add('text-slate-400');
    } else {
        timeInput.disabled = true;
        timeInput.value = ''; 
        timeSuffix.style.opacity = '0.3';
        timeLabel.classList.remove('text-slate-400');
        timeLabel.classList.add('text-slate-600');
    }
}
