// phina.js をグローバル領域に展開
phina.globalize();

// 定数
var GRID_SIZE = 70; // グリッドのサイズ
var SCREEN_SPACE = 10; // 画面端の空白
var PANEL_NUM_X = 9; // 横のパネル数
var PANEL_NUM_Y = 10; // 縦のパネル数
var PANEL_MARGIN_RATIO = 1.3; // 画面縦の空白の割合
var PANEL_SIZE_RATIO = 0.9; // パネル大きさの割合
var BOMB_NUM = 10; // 爆弾数
var SCREEN_WIDTH = GRID_SIZE * PANEL_NUM_X + SCREEN_SPACE// 画面横サイズ
var SCREEN_HEIGHT = GRID_SIZE * PANEL_NUM_Y * PANEL_MARGIN_RATIO + SCREEN_SPACE; // 画面縦サイズ
var PANEL_SIZE = GRID_SIZE * PANEL_SIZE_RATIO; // パネルの大きさ
var PANEL_OFFSET = (GRID_SIZE + SCREEN_SPACE) / 2; // オフセット値

// メインシーン
phina.define('MainScene', {
  superClass: 'DisplayScene',
  // コンストラクタ
  init: function() {
    // 親クラス初期化
    this.superInit({
      width: SCREEN_WIDTH,
      height: SCREEN_HEIGHT,
    });
    // 背景色
    this.backgroundColor = '#808080'; // 背景色 ≒'gray'
    // タッチ不可に
    this.setInteractive(false);
    // グリッド
    var grid = Grid(GRID_SIZE * PANEL_NUM_X, PANEL_NUM_X);
    // グループ
    var panelGroup = DisplayElement().addChildTo(this);
    // 爆弾位置をランダムに決めた配列を作成
    var bombs = [];
    (PANEL_NUM_X * PANEL_NUM_Y).times(function() {
      bombs.push(false);
    });
    bombs.fill(true, 0, BOMB_NUM).shuffle();

    var self = this;
    // ピース配置
    PANEL_NUM_X.times(function(spanX) {
      PANEL_NUM_Y.times(function(spanY) {
        // パネル作成
        var panel = Panel().addChildTo(panelGroup);
        // Gridを利用して配置
        panel.x = grid.span(spanX) + PANEL_OFFSET;
        panel.y = grid.span(spanY) + PANEL_OFFSET;
        // パネルに爆弾情報を紐づける
        panel.isBomb = bombs[spanX * PANEL_NUM_Y + spanY];
        // 開かれているかどうか
        panel.isOpen = false;
        // タッチ有効化
        panel.setInteractive(true);
        // パネルタッチ時
        panel.onpointstart = function() {
          // マークモードなら
          if (self.mode === 'mark') {
            if (!panel.isOpen && !panel.isMark) {
              // マーク追加
              if (self.markCount < BOMB_NUM) {
                Mark().addChildTo(panel);
                panel.isMark = true;
                self.markCount++;
              }
            }
            else {
              if (self.markCount > 0) {
                // マーク削除
                panel.children[0].remove();
                panel.isMark = false;
                self.markCount--;
              }
            }
          }
          else {
            // パネルを開く
            self.openPanel(panel);
            // クリア判定
            self.checkClear();
          }
        };
      });
    });
    // モード
    this.mode = 'normal';
    // マークモードボタン
    Button({
      width: SCREEN_WIDTH / 5,
      height: SCREEN_HEIGHT / 10,
      text: 'Mark',
      fill: '#c0c0c0', // 塗りつぶし色 ≒'silver'
    }).addChildTo(this)
      .setPosition(this.gridX.span(14), this.gridY.span(14.5))
      .onpush = function() {
        // モード変更
        if (self.mode === 'normal') {
          this.fill = '#19E5A1'; // 塗りつぶし色 ≒ hsl(160, 80%, 50%)
          self.mode = 'mark';
        }
        else {
          this.fill = '#c0c0c0', // 塗りつぶし色 ≒'silver'
          self.mode = 'normal';
        }
      };
    // 参照用
    this.panelGroup = panelGroup;
    // クリア判定用
    this.oCount = 0;
    // マークの数
    this.markCount = 0;
    },
  // クリア判定
  checkClear: function() {
    if (this.oCount === PANEL_NUM_X * PANEL_NUM_Y - BOMB_NUM) {
      // ラベル表示
      Label({
        text: 'GOOD JOB!',
        fill: '#ffffff', // 文字色 ≒'white'
      }).addChildTo(this).setPosition(SCREEN_WIDTH / 2, SCREEN_HEIGHT * (PANEL_MARGIN_RATIO + 1) / (PANEL_MARGIN_RATIO * 2));
      // パネルを選択不可に
      this.panelGroup.children.each(function(panel) {
        panel.setInteractive(false);
      });
    }
  },
  // 画面タッチ可能な場合
  onpointstart: function() {
    // 再スタート
    this.exit({
      nextLabel: 'main',
    });
  },
  // パネルを開く処理
  openPanel: function(panel) {
    // マークされていたら何もしない
    if (panel.isMark) return;
    // 爆弾ならゲームオーバー
    if (panel.isBomb) {
      Explosion().addChildTo(panel);
      this.showAllBombs();
      return;
    }
    // 既に開かれていた何もしない
    if (panel.isOpen) return;
    // 開いたとフラグを立てる
    panel.isOpen = true;
    this.oCount++;
    // タッチ不可にする
    panel.setInteractive(false);

    var bombs = 0;
    var indexs = [-1, 0, 1];
    var self = this;
    // 周りのパネルの爆弾数をカウント
    indexs.each(function(i) {
      indexs.each(function(j) {
        var pos = Vector2(panel.x + i * GRID_SIZE, panel.y + j * GRID_SIZE);
        var target = self.getPanel(pos);
        if (target && target.isBomb) bombs++;
      });
    });
    // パネルに数を表示
    panel.num = bombs === 0 ? '' : bombs;
    Label({
      text: panel.num,
      fill: '#ffffff', // 文字色 ≒'white'
    }).addChildTo(panel);
    panel.fill = '#808080'; // 塗りつぶし色 ≒'gray'
    // 周りに爆弾がなければ再帰的に調べる
    if (bombs === 0) {
      indexs.each(function(i) {
        indexs.each(function(j) {
          var pos = Vector2(panel.x + i * GRID_SIZE, panel.y + j * GRID_SIZE);
          var target = self.getPanel(pos);
          target && self.openPanel(target);
        });
      });
    }
  },

  // 指定された位置のパネルを得る
  getPanel: function(pos) {
    var result = null;
    
    this.panelGroup.children.some(function(panel) {
      if (panel.position.equals(pos)) {
        result = panel;
        return true;
      }
    });
    return result;
  },

  // 爆弾を全て表示する
  showAllBombs: function() {
    var self = this;

    this.panelGroup.children.each(function(panel) {
      panel.setInteractive(false);

      if (panel.isBomb) {
        Bomb().addChildTo(panel);
        panel.tweener.clear().scaleTo(1.2, 100)
                     .scaleTo(1.0, 100)
                     .call(function() {
                        // ラベル表示
                        Label({
                          text: 'TOUCH TO RESTART',
                          fill: '#ffffff', // 文字色 ≒'white'
                        }).addChildTo(self).setPosition(SCREEN_WIDTH / 2, SCREEN_HEIGHT * (PANEL_MARGIN_RATIO + 1) / (PANEL_MARGIN_RATIO * 2));
                        // 画面をタッチ可能に
                        self.setInteractive(true);
                     });
      }
    });
  },
});

// パネルクラス
phina.define('Panel', {
  // RectangleShapeを継承
  superClass: 'RectangleShape',
    // コンストラクタ
    init: function() {
      // 親クラス初期化
      this.superInit({
        width: PANEL_SIZE,
        height: PANEL_SIZE,
        fill: '#c0c0c0', // 塗りつぶし色 ≒'silver'
        stroke: '#ffffff', // 枠の色 ≒'white'
        cornerRadius: 2, // 角の丸み
      });
      // 開かれているかどうか
      this.isOpen = false;
      // マークつけれているかどうか
      this.isMark = false;
      // タッチ有効化
      this.setInteractive(true);
    },
});

// 爆弾クラス
phina.define('Bomb', {
  // Shapeを継承
  superClass: 'Shape',
    // コンストラクタ
    init: function() {
      // 親クラス初期化
      this.superInit({
        width: GRID_SIZE,
        height: GRID_SIZE,
        backgroundColor: 'transparent',
      });
      // 導線
      RectangleShape({
        width: PANEL_SIZE / 8,
        height: PANEL_SIZE / 8,
        fill: "#000088", // 塗りつぶし色 ≒'navy'
        stroke: '#ffffff', // 枠の色 ≒'white'
        y: -20,
      }).addChildTo(this);
      // 本体
      CircleShape({
        radius: PANEL_SIZE / 4,
        fill: "#000088", // 塗りつぶし色 ≒'navy'
        stroke: '#ffffff', // 枠の色 ≒'white'
      }).addChildTo(this);
    },
});

// 爆発クラス
phina.define('Explosion', {
  // StarShapeを継承
  superClass: 'StarShape',
    // コンストラクタ
    init: function() {
      // 親クラス初期化
      this.superInit({
        radius: (PANEL_SIZE + 5) / 2,
        sides: 10,
        sideIndent: 0.75,
        rotation: 15,
        fill: '#ff0000', // 塗りつぶし色 ≒'red'
        stroke: '#ffff00', // 枠の色 ≒'yellow'
      });
    },
});

// マーククラス
phina.define('Mark', {
  // RectangleShapeを継承
  superClass: 'RectangleShape',
    // コンストラクタ
    init: function() {
      // 親クラス初期化
      this.superInit({
        width: PANEL_SIZE / 19,
        height: PANEL_SIZE,
        fill: '#ff0000', // 塗りつぶし色 ≒'red'
        stroke: '#ff0000', // 枠の色 ≒'red'
        rotation: 45,
      });
      
      CircleShape({
        width: PANEL_SIZE,
        height: PANEL_SIZE,
        fill: "transparent", // 塗りつぶし色 ＝ 透明
        stroke: '#ff0000', // 枠の色 ≒'red'
        strokeWidth: PANEL_SIZE / 10,
      }).addChildTo(this);
    },
});

// メイン
phina.main(function() {
  var app = GameApp({
    startLabel: 'main', // メイン画面からスタート
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  });
  app.run();
});