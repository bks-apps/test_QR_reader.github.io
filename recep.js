
const USE_PHONE = (window.matchMedia('(max-device-width: 768px)').matches);
const CANVAS_WIDTH = 640;
const CANVAS_HEIGHT = 360;

var ctx;
var flgCaramaRun = false;
var scanTimerId = null;

// DOM要素の取得
var containor = HTMLElement;
var video = HTMLElement;
var canvas = HTMLElement;
var placeholder = HTMLElement;
var cameraStatusText = HTMLElement;
var modeQr = HTMLElement;
var modeManual = HTMLElement;
var btnModeQr = HTMLElement;
var btnModeManual = HTMLElement;
var iconQr = HTMLElement;
var iconManual = HTMLElement;
var scanTarget = HTMLElement;
var manualInput = HTMLElement;
var submitBtn = HTMLElement;
var toast = HTMLElement;

/** 設定データ取得待ちのポップアップ通知 */
var toastDataWait = HTMLElement;
/** 起動時インフォメーションのポップアップ通知 */
var toastAppInfo = HTMLElement;
var btnAppInfoClose = HTMLElement;
/** エラー時のポップアップ通知 */
var toastError = HTMLElement;
/** 不正QRコードの場合のメッセージ */
var qrErrMessage = HTMLElement;

var kanaInput = HTMLElement;
var suggestionList = HTMLElement;   // 入力候補
var nameSelect = HTMLElement;
var deptSelect = HTMLElement;
var meetingStatus = HTMLElement;
var contactForm = HTMLElement;



/** 画面ロード時の処理 */
window.onload = async function() {

    console.time('window.onload')

    // 💡ページを離れる/リロードする直前にリクエストを強制切断（GET化の残骸防止）
    window.onbeforeunload = () => {
        if (fetchController) fetchController.abort();
    };

    // DOM要素の取得
    containor = document.getElementById('containor');
    video = document.getElementById('camera-stream');
    canvas = document.getElementById('camera-canvas');

    placeholder = document.getElementById('camera-placeholder');
    cameraStatusText = document.getElementById('camera-status-text');

    modeQr = document.getElementById('mode-qr');
    modeManual = document.getElementById('mode-manual');

    btnModeQr = document.getElementById('btn-mode-qr');
    btnModeManual = document.getElementById('btn-mode-manual');

    iconQr = document.getElementById('icon-container-qr');
    iconManual = document.getElementById('icon-container-manual');

    scanTarget = document.getElementById('scan-target');
    manualInput = document.getElementById('manual-input');
    submitBtn = document.getElementById('submit-btn');
    toast = document.getElementById('toast');

    /** 設定データ取得待ちのポップアップ通知 */
    toastDataWait = document.getElementById('toast-getData-wait');
    /** エラー時のポップアップ通知 */
    toastError = document.getElementById('toast-error');

    /** 起動時インフォメーションのポップアップ通知 */
    toastAppInfo = document.getElementById('toast-appli-info');
    btnAppInfoClose = document.getElementById('btn-appInfo-close');
    /** 不正QRコードの場合のメッセージ */
    qrErrMessage = document.getElementById('qr-error-message');

    // 各入力域のDOM要素取得
    kanaInput = document.getElementById('kana-input');
    suggestionList = document.getElementById('suggestion-list');
    nameSelect = document.getElementById('name-select');
    deptSelect = document.getElementById('dept-select');
    meetingStatus = document.getElementById('meeting-status');
    contactForm = document.getElementById('contact-form');


    // GETパラメータの取得
    args = getArguments();

    // titleタグの書き換え
    const title = document.getElementById('appli-title');
    switch(args.mode) {
        case 'recep':
            title.innerText = '会議受付[QR]';
            break;
        case 'gathering':
            title.innerText = '懇親会[QR]';
            break;
        default:
            break;
    }

    // 設定データ取得待ちの表示
    clearTimeout(toastTimeout);
    toastDataWait.classList.remove('translate-y-20', 'hidden', 'pointer-events-none');
    toastDataWait.classList.add('translate-y-0', 'opacity-100');

    try {
        // 設定データ＆社員情報一覧の取得
        console.groupCollapsed('設定データ＆社員情報一覧の取得');
        console.time('　getFetchData')
        let data = await getFetchData(GAS_URL, 'recep.html', args, sendParam_getEmployee);
        console.timeEnd('　getFetchData')

        // 取得結果を定数に格納
        console.time('　setConstants')
        setConstants(data, false);
        console.timeEnd('　setConstants')
        console.groupEnd('設定データ＆社員情報一覧の取得');

    } catch (fetchError) {
        showToastError(
            fetchError
            ,false
        );
        return false;
    }

    // アプリ情報の記述
    drawSettingData(SETTING_DATA);

    // データ取得完了後に、設定データ取得待ちを隠す
    toastDataWait.classList.remove('translate-y-0', 'opacity-100');
    toastDataWait.classList.add('hidden');

    // 起動時インフォメーションの表示
    showAppliInfo(
        SETTING_DATA.version
        ,SETTING_DATA.app_mode
        ,SETTING_DATA.info_message
    );

    // カメラの起動
    console.log('カメラ起動');
    startCamera();
    // カメラ映像部などのメイン部分を表示
    containor.classList.remove('hidden');
    containor.classList.add('opacity-100');

    btnModeQr.addEventListener('click', switchToQr);
    btnModeManual.addEventListener('click', switchToManual);
    // 手動入力フォーム制御
    submitBtn.addEventListener('click', btnSubmit);





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
        const selectedMember = EMPLOYEE_LIST.get(targetKana);
        console.table(selectedMember);

        if (selectedMember) {
            // 入力欄にdata属性をセット
            kanaInput.value = selectedMember.kana;
            kanaInput.dataset.kana = selectedMember.kana;
            kanaInput.dataset.rowNo = selectedMember.row_no;
            kanaInput.dataset.userNo = selectedMember.user_no;
            kanaInput.dataset.mail = selectedMember.mail;
            kanaInput.dataset.dept = selectedMember.dept;
            kanaInput.dataset.name = selectedMember.name;
            kanaInput.dataset.seat = (SETTING_DATA.mode_jp === '会議受付' ? selectedMember.seat_meeting: selectedMember.seat_gathering);

            // 氏名、所属、会議に反映
            nameSelect.innerHTML = '<option value="" >かなを入力／選択すると自動反映されます</option>';
            nameSelect.innerHTML += `<option value="${selectedMember.name}" selected>${selectedMember.name}</option>`;
            deptSelect.innerHTML = '<option value="" >かなを入力／選択すると自動反映されます</option>';
            deptSelect.innerHTML += `<option value="${selectedMember.dept}" selected>${selectedMember.dept}</option>`;
            meetingStatus.innerHTML = '<option value="" >かなを入力／選択すると自動反映されます</option>';
            meetingStatus.innerHTML += `<option value="参加" selected>⭕参加</option>`;

            // スタイルをアクティブカラーに変更
            nameSelect.classList.remove('text-slate-500');
            nameSelect.classList.add('text-slate-100');
            deptSelect.classList.remove('text-slate-500');
            deptSelect.classList.add('text-slate-100');
            meetingStatus.classList.remove('text-slate-500');
            meetingStatus.classList.add('text-slate-100');
        }
        suggestionList.classList.add('hidden');
    });

    // 枠外をクリックしたら候補リストを閉じる
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#autocomplete-wrapper')) {
            suggestionList.classList.add('hidden');
        }
    });

    console.timeEnd('window.onload')
    console.log('アプリ起動完了');
}

/** カメラストリーム起動 */
async function startCamera() {
    try {
        cameraStatusText.innerText = "Accessing Camera...";
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: (USE_PHONE ? 'environment': 'user')
                ,aspectRatio: { ideal: 0.5625 }     // スマホの縦持ちに最適なアスペクト比と解像度を指定（9:16 → 9÷16=0.5625）
                ,width: (USE_PHONE ? CANVAS_HEIGHT*1.5: CANVAS_WIDTH*1.5)    // スマホはカメラ映像が縦長のためwidthとheightを入れ替える
                ,height: (USE_PHONE ? CANVAS_WIDTH*1.5: CANVAS_HEIGHT*1.5)   // スマホはカメラ映像が縦長のためwidthとheightを入れ替える
            }
            ,audio: false
        });
        
        video.srcObject = stream;
        video.onloadedmetadata = () => {
            video.play();
            video.classList.remove('opacity-0');
            video.classList.add('opacity-100');
            placeholder.classList.add('opacity-0');
            setTimeout(() => {
                placeholder.style.display = 'none';
            }, 700);

            ctx = canvas.getContext('2d', { willReadFrequently: true });
            canvas.width = CANVAS_WIDTH;
            canvas.height = CANVAS_HEIGHT;
            console.table({
                videoWidth: canvas.width
                ,videoHeight: canvas.height
            });

            flgCaramaRun = true;
            startScanLoop();
        };

    } catch (err) {
        console.error("Camera access error:", err);
        cameraStatusText.innerText = "SIMULATED CAMERA ACTIVE";
        cameraStatusText.classList.add('text-emerald-500');
    }
}
/** 💡ループ安定化：スキャンタイマーの開始管理 */
function startScanLoop() {
    if (scanTimerId) { clearTimeout(scanTimerId); }
    scanTimerId = setTimeout(checkImage, 800);
}
/** カメラ映像を一旦停止 */
function cameraStop() {
    flgCaramaRun = false;
    if (scanTimerId) { clearTimeout(scanTimerId); scanTimerId = null; } // 💡完全にタイマーを止める
    // カメラ停止
    video.pause();
    console.log('カメラ停止');
}
/** カメラ映像を再開 */
function cameraReStart() {
    // 再起呼び出し
    flgCaramaRun = true;
    // カメラ再開
    video.play();
    console.log('カメラ再開');
    // ループを再起動
    startScanLoop();
}
/** QRコードの検出 */
async function checkImage() {
    // settimeoutで常に再起呼び出しされるため、カメラ停止中は処理をせずに抜ける
    if (!flgCaramaRun) { return; }

    try {
        // 💡描画エラー防止：ビデオのフレームが描画可能（readyState >= 2）かチェック
        if (video.readyState >= video.HAVE_CURRENT_DATA) {
            // imageDataを作ってjsQRに渡す
            ctx.drawImage(video, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            const imageData = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            const code = jsQR(imageData.data, imageData.width, imageData.height);
            
            // QRコードが検出できた場合
            if (code) {
                // カメラ映像を一旦停止する
                cameraStop();

                // 正しいQRコードかどうかのフラグ（初期値：false）
                let _isCorrect = false;

                // QRコード内容の入力チェック
                let _qr_data = code.data.split(',').map((_val) => _val.trim());
                console.table(_qr_data);
                if (_qr_data.length != 2) { console.warn('不正なQRコード検出：データ件数', _qr_data); }
                else if (typeof _qr_data[0] != 'string') { console.warn('不正なQRコード検出：1つ目のデータ型', _qr_data); }
                else if (typeof _qr_data[1] != 'string') { console.warn('不正なQRコード検出：2つ目のデータ型', _qr_data); }
                else {
                    // _qr_data[0]の値がスプレッドシート取得データの日付と一致するかチェック
                    if (_qr_data[0] != SETTING_DATA.date.trim()) { console.warn('不正なQRコード検出：設定情報の日付と相違', _qr_data); }
                    // _qr_data[1]の値で社員番号を検索し、該当者がいるかチェック
                    else if (EMPLOYEE_INFO.has(_qr_data[1])) {
                        _isCorrect = true;
                    }
                }

                // 不正なQRコードだった場合、「不正なQR」の文字を表示し処理を抜ける
                if (!_isCorrect) {
                    qrErrMessage.classList.remove('hidden');
                    scanTarget.classList.remove('bg-slate-900/10');
                    scanTarget.classList.add('bg-slate-900/50');
                    // エラー音
                    playBeep(false);

                    setTimeout(() => {
                        // 不正QRエラーメッセージを隠す
                        qrErrMessage.classList.add('hidden');
                        scanTarget.classList.remove('bg-slate-900/50');
                        scanTarget.classList.add('bg-slate-900/10');
                        // カメラ映像を再開する
                        cameraReStart();
                    }, 2000);
                    return;
                }

                // QRコード内容を画面に描画
                console.group('QRコード検出：正しいQRコード');
                let _employee = EMPLOYEE_INFO.get(_qr_data[1]);
                console.log('社員情報');
                console.table(_employee);
                showToastSuccess(
                    _employee.dept + '<br/>' + _employee.name
                    ,_employee.seat_meeting
                );

                // GAS更新処理を呼び出し
                const sendData = {
                    // GAS実行処理
                    "action": (SETTING_DATA.mode_jp === '会議受付' ? 'entryMeeting': 'entryGathering')
                    // データ登録用情報
                    ,"data": {
                        "row_no": _employee.row_no
                        ,"user_no": _employee.user_no
                        ,"user_dept": _employee.dept
                        ,"user_name": _employee.name
                        // データ登録＆メール送信用情報
                        ,"title": SETTING_DATA.title
                        ,"date_jp": SETTING_DATA.date_jp
                        ,"date_short": SETTING_DATA.date_short
                        ,"venue": (SETTING_DATA.mode_jp === '会議受付' ? SETTING_DATA.venue_meeting: SETTING_DATA.venue_gathering)
                        ,"app_mode": SETTING_DATA.app_mode
                        ,"mode": SETTING_DATA.mode_jp.replace('受付', '')
                        ,"mail_from": SETTING_DATA.mail_from
                        ,"mail_to": _employee.mail
                        ,"mail_attach": (SETTING_DATA.mode_jp === '会議受付' ? SETTING_DATA.seating_chart_meeting: SETTING_DATA.seating_chart_gathering)
                        ,"no_send_mail_dept": SETTING_DATA.no_send_mail_dept.concat()
                        ,"attendance": {
                            "meeting": "参加"
                            ,"gathering": "参加"
                        }
                        ,"absence_url": SETTING_DATA.absence_url + '?date=' + SETTING_DATA.date_short + '&id=' + _employee.user_no
                        
                        // 座席位置
                        ,"seat": (SETTING_DATA.mode_jp === '会議受付' ? _employee.seat_meeting: _employee.seat_gathering)
                        ,"comment": ''  // 空白固定

                        ,"lost_qr_cord": false   // 未使用
                        ,"lost_staff_card": false   // 未使用

                        ,"manual": false   // false固定
                    }
                }
                console.table(sendData.action);
                console.table(sendData.data);
                setTimeout(() => {
                    // カメラ映像を再開する
                    cameraReStart();
                }, 5000);

                // GAS更新処理を呼び出し
                let data = await getFetchData(GAS_URL, 'recep.html', args, sendData.action, sendData.data);
                console.groupEnd();
                return;
            }
        }

    }  catch (e) {
        // エラーが発生した場合、何も処理しない
        console.error(e);
        showToastError(
            e.message
            ,false
        );
    }
    
    // 💡ループ安定化：正常時・未検出時のみ、安全に次のループを呼び出し
    if (flgCaramaRun) {
        scanTimerId = setTimeout(checkImage, 800);
    }
}

let toastTimeout;
/** 起動時インフォメーションの表示 */ 
function showAppliInfo(_version, _app_mode, _ary_message) {
    clearTimeout(toastTimeout);

    // バージョン情報
    const appliVersion = document.getElementById('appli-version');
    appliVersion.innerText = _version;

    // 動作モード（動作確認モードの場合のみ表示）
    const appliMode = document.getElementById('appli-mode');
    if (_app_mode === "動作確認モード") {
        appliMode.classList.remove('hidden');
    }

    // インフォメーション
    const oldnew = document.getElementById('old-new-info');
    _ary_message.forEach((item) => {
        let div = document.createElement('div');
        div.innerText = item;
        oldnew.append(div);
    });

    // 閉じるボタン押下イベント
    btnAppInfoClose.addEventListener('click', closeToastAppInfo);

    // トースト表示アニメーション
    toastAppInfo.classList.remove('translate-y-20', 'hidden', 'pointer-events-none');
    toastAppInfo.classList.add('translate-y-0', 'opacity-100');

    // 何もしなくても60秒後に隠す
    toastTimeout = setTimeout(() => {
        closeToastAppInfo();
    }, 60000);
}
/** 起動時インフォメーションを隠す */
function closeToastAppInfo() {
    // 起動時インフォメーションを隠す
    toastAppInfo.classList.remove('translate-y-0', 'opacity-100');
    toastAppInfo.classList.add('hidden');
}
/** 受付完了時ポップアップ通知の表示 */
function showToastSuccess(_message, _seat) {
    clearTimeout(toastTimeout);
    
    let timer = 5000;
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


// 2. モード切替ロジック
function switchToQr() {
    // カメラ映像を再開する
    cameraReStart();
    
    // UIの切り替え
    modeQr.classList.remove('hidden');
    setTimeout(() => {
        modeQr.classList.add('scale-100', 'opacity-100');
        modeQr.classList.remove('scale-95', 'opacity-0');
    }, 5);
    
    modeManual.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        modeManual.classList.add('hidden');
    }, 5);

    // フッターアイコンのアクティブ表現
    btnModeQr.classList.remove('opacity-50');
    btnModeManual.classList.add('opacity-50');

    iconQr.classList.add('bg-emerald-500/10', 'border', 'border-emerald-500/20', 'text-emerald-400');
    iconQr.classList.remove('text-slate-400');
    iconManual.classList.remove('bg-amber-500/10', 'border', 'border-amber-500/20', 'text-amber-400');
    iconManual.classList.add('text-slate-400');
}
function switchToManual() {
    
    // カメラ映像を一旦停止する
    cameraStop();

    // UIの切り替え
    modeManual.classList.remove('hidden');
    setTimeout(() => {
        modeManual.classList.add('scale-100', 'opacity-100');
        modeManual.classList.remove('scale-95', 'opacity-0');
    }, 5);

    modeQr.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        modeQr.classList.add('hidden');
    }, 5);

    // フッターアイコンのアクティブ表現
    btnModeManual.classList.remove('opacity-50');
    btnModeQr.classList.add('opacity-50');

    iconManual.classList.add('bg-amber-500/10', 'border', 'border-amber-500/20', 'text-amber-400');
    iconManual.classList.remove('text-slate-400');
    iconQr.classList.remove('bg-emerald-500/10', 'border', 'border-emerald-500/20', 'text-emerald-400');
    iconQr.classList.add('text-slate-400');
}

/** リスト描画の共通処理（空文字なら全件表示、文字があれば絞り込み）*/
function updateSuggestions() {
    // 入力がない場合は全件、ある場合は部分一致でフィルタリング
    const query = kanaInput.value.trim().toLowerCase();
    const filtered = query 
        ? Array.from(EMPLOYEE_LIST.entries()).filter(([key]) => key.includes(query))
        : Array.from(EMPLOYEE_LIST.entries());

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
                <div class="text-xs text-slate-300">` + member[1].name + ` ［` + member[1].dept + `］</div>
            </li>
        `).join('');
        suggestionList.classList.remove('hidden');
    } else {
        suggestionList.innerHTML = `<li class="px-4 py-3 text-sm text-slate-600 text-center">該当する候補がいません</li>`;
        suggestionList.classList.remove('hidden');
    }
}

// 手動入力フォーム制御
function btnSubmit() {
    const val = manualInput.value.trim();
    if (val === "") {
        return;
    }
    // 受付シミュレーション
    showToastSuccess(`番号: ${val} の受付が完了しました`, "確認用パスコード認証成功");
    manualInput.value = "";
};
