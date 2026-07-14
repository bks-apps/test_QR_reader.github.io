// DOM要素の取得
var containor = HTMLElement;

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
// /** 不正QRコードの場合のメッセージ */
// var qrErrMessage = HTMLElement;

/** 設定データ取得待ちのポップアップ通知 */
var toastDataWait = HTMLElement;
/** エラー時のポップアップ通知 */
var toastError = HTMLElement;

var kanaInput = HTMLElement;
var suggestionList = HTMLElement;   // 入力候補
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

    // 設定データ取得待ちの表示
    clearTimeout(toastTimeout);
    toastDataWait.classList.remove('translate-y-20', 'hidden', 'pointer-events-none');
    toastDataWait.classList.add('translate-y-0', 'opacity-100');

    try {
        // 設定データ＆社員情報一覧の取得
        console.groupCollapsed('設定データ＆社員情報一覧の取得');
        let data = await getFetchData(GAS_URL, 'report.html', args, sendParam_getEmployee);

        // 取得結果
        SETTING_DATA = data.settingData;
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

    // アプリ情報の記述
    drawSettingData(SETTING_DATA);

    // データ取得完了後に、設定データ取得待ちを隠す
    toastDataWait.classList.remove('translate-y-0', 'opacity-100');
    toastDataWait.classList.add('hidden');

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

/** リスト描画の共通処理（空文字なら全件表示、文字があれば絞り込み）*/
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

/** 遅刻・欠席欄の表示制御 */
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
