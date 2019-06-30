var properties    = PropertiesService.getScriptProperties();
var botOAuthToken = properties.getProperty('bot_oauth_token');

var s3BucketName  = properties.getProperty('s3_bucket_name');
var s3FolderName  = properties.getProperty('s3_folder_name');
var iconUrl       = 'https://' + s3BucketName + '.s3-ap-northeast-1.amazonaws.com/' + s3FolderName + '/ugaki_misato.jpg';

var slackApp      = SlackApp.create(botOAuthToken);
var option        = {
                      username : '宇垣美里',
                      icon_url : iconUrl
                     };

/**
 * メイン処理
 *
 * @param object e
 * @return void
 */
function doPost(e) {
  const verifiedToken = properties.getProperty('verified_token');
  const token         = e.parameter.token;
  if (verifiedToken !== token) { return; }

  const channel   = e.parameter.channel_name;
  const post      = e.parameter.text;

  const sentiment = analyzeSentiment(channel, post);
  const message   = getMessage(channel, sentiment);

  const image     = getImage(channel);

  postMessageToSlack(channel, message);
  postImageToSlack(channel, image)
}

/**
 * GoogleCloudNaturalLanguageAPIを叩いて、
 * Slackに送信されたテキストがpositiveかnegativeか判別する
 *
 * @param string channel
 * @param string post
 * @return string sentiment
 */
function analyzeSentiment(channel, post) {
  if (!channel || !post) {
    slackApp.postMessage(channel, 'いまなんて言ったの？もう1回教えてほしいな。。。', option);
  }

  const apiKey = properties.getProperty("google_cloud_natural_language_api_key");
  const url    = 'https://language.googleapis.com/v1/documents:analyzeSentiment?key=' + apiKey;
  const data   = {
    'document' : {
      'type'     : 'PLAIN_TEXT',
      'language' : 'ja',
      'content'  : post
    },
    'encodingType': 'UTF8'
  };
  const params = {
    'contentType' : 'application/json',
    'method'      : 'post',
    'payload'     : JSON.stringify(data)
  };

  const result = UrlFetchApp.fetch(url, params);
  const score  = JSON.parse(result)['documentSentiment']['score'];

  if (!score) {
    slackApp.postMessage(channel, 'なんで返信してくれないの。。。', option);
    return;
  }
  const sentiment = score >= 0 ? 'positive' : 'negative';
  return sentiment;
}

/**
 * Slackに送信する文言を取得する
 *
 * @param string channel
 * @param string sentiment
 * @return string
 */
function getMessage(channel, sentiment) {
  if (!channel || !sentiment) {
    slackApp.postMessage(channel, 'もう気持ちが分からないよ。。。', option);
  }
  
  return getCellAtRandomFromSpreadsheet(channel, sentiment);
}

/**
 * Slackに送信する画像（GoogleDrive）を取得する
 *
 * @param string channel
 * @return blob
 */
function getImage(channel) {
  if (!channel) {
    slackApp.postMessage(channel, 'もう帰れる家なんてないよ。。。', option);
  }

  const imageId = getCellAtRandomFromSpreadsheet(channel, 'image');
  return UrlFetchApp.fetch('https://drive.google.com/uc?export=view&id=' + imageId).getBlob();
}

/**
 * GoogleSpreadsheetに記載されているテキストをランダムに取得する
 *
 * @param string channel
 * @param string sheetName
 * @return string
 */
function getCellAtRandomFromSpreadsheet(channel, sheetName) {
  if (!channel || !sheetName) {
    slackApp.postMessage(channel, 'お手紙なくしちゃった。。。', option);
  }

  const sheet      = SpreadsheetApp.getActive().getSheetByName(sheetName);
  const data       = sheet.getDataRange().getValues();
  const lastRow    = sheet.getLastRow();
  const randomRow  = Math.floor(Math.random() * lastRow);
  return data[randomRow][0];
}

/**
 * Slackにメッセージを送信する
 *
 * @param string channel
 * @param string message
 * @return void
 */
function postMessageToSlack(channel, message) {
  if (!channel || !message) {
    slackApp.postMessage(channel, '伝えたいこと忘れちゃった。。。', option);
  }

  slackApp.postMessage(channel, message, option);
}

/**
 * Slackに画像を送信する
 *
 * @param string channel
 * @param blob image
 * @return void
 */
function postImageToSlack(channel, image) {
  if (!channel || !image) {
    slackApp.postMessage(channel, 'そんな簡単に、この気持ちは表現できないよ。。。', option);
  }

  slackApp.filesUpload(image, {
    channels : channel,
    title    : 'image',
    username : '宇垣美里',
    icon_url : 'https://' + s3BucketName + '.s3-ap-northeast-1.amazonaws.com/' + s3FolderName + '/ugaki_misato.jpg'
  });
}
