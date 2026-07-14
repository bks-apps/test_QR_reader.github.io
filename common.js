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
const sendParam_getEmployee = 'getEmployeeData';
var sendParamMeeting = { action: 'updateMeeting' };
var sendParamgathering = { action: 'updategathering' };



/** GETパラメータの取得 */
function getArguments() {
    // GETパラメータの取得
    console.groupCollapsed('GETパラメータの取得');
    const params = new URLSearchParams(window.location.search);

    // 取得結果
    console.table({
        pass: params.get('pass') === '' ? null: params.get('pass')
        ,mode: params.get('mode') === '' ? null: params.get('mode')
        ,date: params.get('date') === '' ? null: params.get('date')
    });
    console.groupEnd('GETパラメータの取得');

    return {
        pass: params.get('pass') === '' ? null: params.get('pass')
        ,mode: params.get('mode') === '' ? null: params.get('mode')
        ,date: params.get('date') === '' ? null: params.get('date')
    };
}

/** URLFetchを実行しデータを取得する */
async function getFetchData(_url, _file, _args, _action) {
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
                                        ,body: JSON.stringify({
                                            mode: _args.mode
                                            ,pass: _args.pass
                                            ,date: _args.date
                                            ,file: _file
                                            ,action: _action
                                        })
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

/** 設定情報画面描画 */
function drawSettingData() {
    const mode = document.getElementById('mode-name');
    const datetime = document.getElementById('appli-datetime');
    const venue = document.getElementById('appli-venue');

    mode.innerText = SETTING_DATA.mode_jp;
    datetime.innerText = SETTING_DATA.date;
    switch(SETTING_DATA.mode_jp) {
        case '会議受付':
            datetime.innerText += ' ' + SETTING_DATA.meeting_time;
            venue.innerText = SETTING_DATA.venue_meeting;
            break;
        case '懇親会受付':
            datetime.innerText += ' ' + SETTING_DATA.gathering_time;
            venue.innerText = SETTING_DATA.venue_gathering;
            break;
    }
}