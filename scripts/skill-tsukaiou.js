var Simulator, Skill, SkillTree, State, View,
  __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; },
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

SkillTree = (function() {

  /*
  	初期データ
  */
  function SkillTree(treeData) {
    var skill, skillId, _i, _len, _ref;
    this.id = Number(treeData.id);
    this.name = treeData.name;
    this.skills = {};
    _ref = treeData.skills;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      skill = _ref[_i];
      skillId = Number(skill['ID']);
      this.skills[skillId] = new Skill(skill);
    }
  }

  return SkillTree;

})();

/*
サーバから供給されるスキルデータ
*/
Skill = (function() {

  /*
  	初期化
  */
  function Skill(skillData) {
    var i, id, n, requireSkillPoint, requireSkillPointSlv, type, value1, value2, valueSlv1, valueSlv2, _i, _j;
    this.id = Number(skillData['ID']);
    this.icon = {
      'id': Number(skillData['_Icon']),
      'index': Number(skillData['_IconIndex'])
    };
    this.gridIndex = Number(skillData['_Grid_Index']);
    this.name = skillData['_Name'];
    this.description = skillData['_Description'].replace(/\\n/g, '<br />');
    this.maxLv = Number(skillData['_MaxSlv']);
    if (0 < Number(skillData['_GetSkillID'])) {
      this.getSkill = {
        'id': Number(skillData['_GetSkillID']),
        'lv': Number(skillData['_GetSkillLv'])
      };
    } else {
      this.getSkill = null;
    }
    this.learnSkill = Number(skillData['_Learn_Skill']);
    this.requireSkills = [];
    if (this.learnSkill) {
      for (i = _i = 1; _i <= 8; i = ++_i) {
        type = Number(skillData["_Require" + i + "_Type"]);
        if (type < 1) {
          break;
        }
        id = Number(skillData["_Require" + i + "_ID"]);
        value1 = Number(skillData["_Require" + i + "_Value1"]);
        value2 = Number(skillData["_Require" + i + "_Value2"]);
        if (type === 3 && id === 2) {
          this.requireSkills.push({
            id: value1,
            lv: value2
          });
        }
      }
    }
    this.upRequireSkills = [];
    this.requireCharacterLvs = (function() {
      var _j, _ref, _results;
      _results = [];
      for (i = _j = 1, _ref = this.maxLv; 1 <= _ref ? _j <= _ref : _j >= _ref; i = 1 <= _ref ? ++_j : --_j) {
        _results.push(0);
      }
      return _results;
    }).call(this);
    for (i = _j = 1; _j <= 2; i = ++_j) {
      type = Number(skillData["_UpRequire" + i + "_Type"]);
      id = Number(skillData["_UpRequire" + i + "_ID"]);
      value1 = Number(skillData["_UpRequire" + i + "_Value1"]);
      value2 = Number(skillData["_UpRequire" + i + "_Value2"]);
      valueSlv1 = Number(skillData["_UpRequire" + i + "_ValueSlv1"]);
      valueSlv2 = Number(skillData["_UpRequire" + i + "_ValueSlv2"]);
      if (type === 1 && id === 3) {
        this.requireCharacterLvs = (function() {
          var _k, _ref, _results;
          _results = [];
          for (n = _k = 1, _ref = this.maxLv; 1 <= _ref ? _k <= _ref : _k >= _ref; n = 1 <= _ref ? ++_k : --_k) {
            _results.push(value1 + (n - 1) * valueSlv1);
          }
          return _results;
        }).call(this);
      }
      if (type === 3 && id === 2) {
        this.upRequireSkills.push({
          'id': value1,
          'lv': value2,
          'slv': valueSlv2
        });
      }
    }
    requireSkillPoint = Number(skillData['_UpRequireSkillPoint']);
    requireSkillPointSlv = Number(skillData['_UpRequireSkillPointSlv']);
    this.requireSkillPoints = (function() {
      var _k, _ref, _results;
      _results = [];
      for (n = _k = 1, _ref = this.maxLv; 1 <= _ref ? _k <= _ref : _k >= _ref; n = 1 <= _ref ? ++_k : --_k) {
        _results.push(requireSkillPoint + (n - 1) * requireSkillPointSlv);
      }
      return _results;
    }).call(this);
  }

  return Skill;

})();

/*
シミュレーターの状態を表すオブジェクト
*/
State = (function() {

  /*
  	初期化
  */
  function State() {
    this.characterLv = 1;
    this.baseSp = 0;
    this.baseSpRatio = 1;
    this.bonusSp = 0;
    this.consumptionSp = 0;
    this.classId = 0;
    this.treeId = 0;
    this.skills = {};
  }

  return State;

})();

/*
シミュレーター本体を使
*/
Simulator = (function() {

  /*
  	初期化
  */
  function Simulator(state) {
    if (state == null) {
      state = new State;
    }
    this.state = state;
    this.cache = {};
    this.tree = null;
  }

  /*
  	外部パラメータから状態を設定する
  */
  Simulator.prototype.setState = function(state) {
    var _this = this;
    return this.setClass(state.classId).done(function() {
      var lv, skill, skillId, _ref, _results;
      _this.setTree(state.treeId);
      _this.changeCharacterLv(state.characterLv);
      _this.addBonusSkillPoint(state.bonusSp);
      _ref = state.skills;
      _results = [];
      for (skillId in _ref) {
        lv = _ref[skillId];
        skill = _this.getSkill(skillId);
        _results.push(_this.changeSkillLv(skillId, lv));
      }
      return _results;
    });
  };

  /*
  	キャッシュからスキルデータを取得する
  */
  Simulator.prototype.getSkill = function(findId) {
    var skill, skillId, tree, treeId, _ref, _ref1;
    findId = Number(findId);
    _ref = this.cache[this.state.classId];
    for (treeId in _ref) {
      tree = _ref[treeId];
      _ref1 = tree.skills;
      for (skillId in _ref1) {
        skill = _ref1[skillId];
        skillId = Number(skillId);
        if (skillId === findId) {
          return skill;
        }
      }
    }
    return null;
  };

  /*
  	サーバから取得した職業のデータをキャッシュに登録する
  	キャッシュが完成たらそのデータを返す
  */
  Simulator.prototype.cacheSkillTreeData = function(classId, data) {
    var tree, _i, _len;
    if (__indexOf.call(this.cache, classId) < 0) {
      this.cache[classId] = {};
    }
    for (_i = 0, _len = data.length; _i < _len; _i++) {
      tree = data[_i];
      this.cache[classId][tree.id] = new SkillTree(tree);
    }
    return this.cache[classId];
  };

  /*
  	現在の状態をリセットする
  */
  Simulator.prototype.reset = function() {
    var lv, skillId, skills;
    skills = this.state.skills;
    for (skillId in skills) {
      lv = skills[skillId];
      this.unlearnSkill(Number(skillId));
    }
    this.changeCharacterLv(1);
    return $(document).trigger('reset.simulator');
  };

  /*
  	職業を設定する（職業が持つスキルのデータをすべて取ってくる
  	サーバからデータを取得する非同期処理があるから、jQuery Deferredオブジェクトを返す
  */
  Simulator.prototype.setClass = function(classId) {
    var _this = this;
    return $.Deferred(function(dfd) {
      dfd.done(function(data) {
        _this.reset();
        _this.state.classId = classId;
        _this.state.baseSpRatio = ( (24 <= classId) && (classId <= 32) ? 3 : 1); // 2013.12.22 サブクラスリニューアル後用の調整
        return $(document).trigger('setClass.simulator', {
          classId: classId,
          trees: data
        });
      });
      if (_this.cache[classId] != null) {
        return dfd.resolve(_this.cache[classId]);
      } else {
        return $.getJSON('data/skill/' + classId + '.json').done(function(data) {
          return dfd.resolve(_this.cacheSkillTreeData(classId, data));
        });
      }
    });
  };

  /*
  	？
  */
  Simulator.prototype.setTree = function(treeId) {
    this.state.treeId = Number(treeId);
    this.tree = this.cache[this.state.classId][treeId];
    return $(document).trigger('setTree.simulator', {
      tree: this.tree
    });
  };

  /*
   
  */
  Simulator.prototype.isLearned = function(skillId) {
    if (this.state.skills[skillId] != null) {
      return true;
    } else {
      return false;
    }
  };

  /*
   
  */
  Simulator.prototype.learnSkill = function(skillId) {
    var requireSkillCurrentLv, requireSkillInfo, requireSkillLv, skill, _i, _len, _ref;
    skill = this.getSkill(skillId);
//debug
//alert("req[0]=" + skill.requireCharacterLvs[0]);
    if (skill) {
      this.state.skills[skillId] = 0;
      _ref = skill.requireSkills;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        requireSkillInfo = _ref[_i];
        requireSkillLv = requireSkillInfo.lv;
        requireSkillCurrentLv = this.state.skills[requireSkillInfo.id] != null ? this.state.skills[requireSkillInfo.id] : 0;
        if (requireSkillCurrentLv < requireSkillLv) {
          this.changeSkillLv(requireSkillInfo.id, requireSkillLv);
        }
      }
      if (skill.getSkill) {
        if (!this.isLearned(skill.getSkill.id)) {
          this.learnSkill(skill.getSkill.id);
        }
      }
      return $(document).trigger('learnSkill.simulator', {
        skillId: skillId
      });
    }
  };

  /*
  	スキルを未習得状態にする
  */
  Simulator.prototype.unlearnSkill = function(skillId) {
    this.changeSkillLv(skillId, 0);
    delete this.state.skills[skillId];
    return $(document).trigger('unlearnSkill.simulator', {
      skillId: skillId
    });
  };

  /*
  	スキルの習得状態を切り替える
  */
  Simulator.prototype.toggleSkillLearned = function(skillId) {
    if (this.isLearned(skillId)) {
      return this.unlearnSkill(skillId);
    } else {
      return this.learnSkill(skillId);
    }
  };

  /*
  	スキルのレベルを変更する
  */
  Simulator.prototype.changeSkillLv = function(skillId, lv) {
    var allRequireCharacterLv, consumptionSkillPoint, currentLv, dependentSkillInfo, lostSkillPoint, lvDiff, point, requireCharacterLv, requireSkillCurrentLv, requireSkillInfo, requireSkillLv, skill, _i, _j, _k, _l, _len, _len1, _len2, _len3, _ref, _ref1, _ref2, _ref3;
    if (!this.isLearned(skillId)) {
      this.learnSkill(skillId);
    }
    currentLv = this.state.skills[skillId];
    lvDiff = lv - currentLv;
    skill = this.getSkill(skillId);
    if (!skill) {
      return;
    }

    if (lvDiff === 0) {
      return;
    } else if (0 < lvDiff) { // スキルLv増加
      requireCharacterLv = skill.requireCharacterLvs[lv - 1];
      if (this.state.characterLv < requireCharacterLv) {
        // 必要キャラクタLvに達していない
        this.changeCharacterLv(requireCharacterLv);
      }

      _ref = skill.upRequireSkills;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        // 必要な前提スキルがあれば再帰的に習得
        requireSkillInfo = _ref[_i];
        requireSkillLv = requireSkillInfo.lv + (lv - 1) * requireSkillInfo.slv;
        requireSkillCurrentLv = this.state.skills[requireSkillInfo.id] != null ? this.state.skills[requireSkillInfo.id] : 0;
        if (requireSkillCurrentLv < requireSkillLv) {
          this.changeSkillLv(requireSkillInfo.id, requireSkillLv);
        }
      }
      consumptionSkillPoint = 0;
      _ref1 = skill.requireSkillPoints.slice(currentLv, +(lv - 1) + 1 || 9e9);
      for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
        point = _ref1[_j];
        consumptionSkillPoint += point;
      }
      this.consumeSkillPoint(consumptionSkillPoint);

    } else { // スキルLv減少
      _ref2 = this.getDependentSkills(skillId, currentLv, lv);
      for (_k = 0, _len2 = _ref2.length; _k < _len2; _k++) {
        // 依存している高位スキルを習得していたら再帰的に未習得化
        dependentSkillInfo = _ref2[_k];
        if (dependentSkillInfo.lv < 0) {
          this.unlearnSkill(dependentSkillInfo.id);
        } else {
          this.changeSkillLv(dependentSkillInfo.id, dependentSkillInfo.lv);
        }
      }
      consumptionSkillPoint = 0;
      _ref3 = skill.requireSkillPoints.slice(lv, +(currentLv - 1) + 1 || 9e9);
      for (_l = 0, _len3 = _ref3.length; _l < _len3; _l++) {
        point = _ref3[_l];
        consumptionSkillPoint += point;
      }
      this.consumeSkillPoint(-1 * consumptionSkillPoint);
    }
    this.state.skills[skillId] = lv;

    if (lvDiff < 0) { // スキルLv減少
      requireCharacterLv = 0 < lv ? skill.requireCharacterLvs[lv - 1] : 1;
      if (requireCharacterLv < this.state.characterLv) {
        // 現在のキャラクタLvより 必要キャラクタLvが低くなる可能性アリ
        allRequireCharacterLv = this.getAllRequireCharacterLv();
        allRequireCharacterLv = ( allRequireCharacterLv > 0 ? allRequireCharacterLv : 1 );	//必要Lvの最低は1とする(なぜか、サブクラスの一部スキルが必要Lv0のため)

        // 2013.12.22 いま変更されたスキルに限定した処理はたぶん不要(これを含め、全体の状況で判断すればOK)
//        lostSkillPoint = (this.state.characterLv - requireCharacterLv) * this.state.baseSpRatio; // サブクラスの場合のLv対SP割合考慮
//        if (allRequireCharacterLv <= requireCharacterLv ) && 0 <= (this.state.baseSp + this.state.bonusSp - (this.state.consumptionSp + lostSkillPoint))) {
//          this.changeCharacterLv(requireCharacterLv);
//        }

        if (allRequireCharacterLv < this.state.characterLv) {
          lostSkillPoint = (this.state.characterLv - allRequireCharacterLv) * this.state.baseSpRatio; // サブクラスの場合のLv対SP割合考慮
//          alert("[debug]ひくい！ " + allRequireCharacterLv + "<" + this.state.characterLv + "   lost=" + lostSkillPoint + "avail=" + (this.state.baseSp + this.state.bonusSp - this.state.consumptionSp) );
          if (lostSkillPoint <= (this.state.baseSp + this.state.bonusSp - this.state.consumptionSp) ) {
            this.changeCharacterLv(allRequireCharacterLv);
          } else {
            // 2013.12.22 必要レベルぴったりまでは下げれなくとも、ギリギリまで下げる
            var downLv = (this.state.baseSp + this.state.bonusSp - this.state.consumptionSp) / this.state.baseSpRatio;
            downLv = Math.floor(downLv);
            this.changeCharacterLv(this.state.characterLv - downLv);
          }
        }
      }
    }
    return $(document).trigger('changeSkillLv.simulator', {
      skill: skill,
      lv: lv
    });
  };

  /*
  	キャラクターのレベルを変更する
  */
  Simulator.prototype.changeCharacterLv = function(lv) {
    this.state.characterLv = lv;
    this.state.baseSp = (lv - 1) * this.state.baseSpRatio;
    $(document).trigger('changeCharacterLv.simulator', {
      lv: lv
    });
    return this.notifySkillPointChanged();
  };

  /*
  	消費スキルポイントを上下する
  	引数diffは？？スキルポイントから？？消費なので
  	 5なら 5P消費
  	-5なら 5P回復となる
  */
  Simulator.prototype.consumeSkillPoint = function(diff) {
    var lackSkillPoint;
    lackSkillPoint = this.state.consumptionSp + diff - (this.state.baseSp + this.state.bonusSp);

    var lackLv = lackSkillPoint / this.state.baseSpRatio;	// サブクラスの場合のLv対SP割合考慮
    lackLv = Math.ceil(lackLv);
    if (0 < lackLv) {
      this.changeCharacterLv(this.state.characterLv + lackLv);
    }
    this.state.consumptionSp += diff;
    return this.notifySkillPointChanged();
  };

  /*
  	ボーナススキルポイントを上下する
  	1なら？bonus+1
  	-1なら？bonus-1
  */
  Simulator.prototype.addBonusSkillPoint = function(diff) {
    var lackSkillPoint;
    if (diff < 0) {
      lackSkillPoint = -1 * (this.state.baseSp + this.state.bonusSp - this.state.consumptionSp + diff);

      var lackLv = lackSkillPoint / this.state.baseSpRatio;	// サブクラスの場合のLv対SP割合考慮
      lackLv = Math.ceil(lackLv);
      if (0 < lackLv) {
        this.changeCharacterLv(this.state.characterLv + lackLv);
      }
    }
    this.state.bonusSp += diff;
    return this.notifySkillPointChanged();
  };

  /*
  	スキルポイントの変更を通知する
  */
  Simulator.prototype.notifySkillPointChanged = function() {
    return $(document).trigger('changeSkillPoint.simulator', {
      base: this.state.baseSp,
      consumption: this.state.consumptionSp,
      bonus: this.state.bonusSp
    });
  };

  /*
  	対象スキルをfromからtoレベルまで下げるときに影響する他のスキルのリストを返す
  */
  Simulator.prototype.getDependentSkills = function(findSkillId, fromLv, toLv) {
    var affectedLv, requireLv, requireSkillInfo, result, skill, skillId, skillLv, upRequireSkillInfo, _i, _j, _len, _len1, _ref, _ref1, _ref2;
    result = [];
    _ref = this.state.skills;
    for (skillId in _ref) {
      skillLv = _ref[skillId];
      skill = this.getSkill(skillId);
      _ref1 = skill.requireSkills;
      for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
        requireSkillInfo = _ref1[_i];
        requireLv = requireSkillInfo.lv;
        if (findSkillId === requireSkillInfo.id && toLv < requireLv) {
          result.push({
            id: skill.id,
            lv: -1
          });
        }
      }
      _ref2 = skill.upRequireSkills;
      for (_j = 0, _len1 = _ref2.length; _j < _len1; _j++) {
        upRequireSkillInfo = _ref2[_j];
        requireLv = upRequireSkillInfo.lv + (fromLv - 1) * upRequireSkillInfo.slv;
        if (findSkillId === upRequireSkillInfo.id && toLv < requireLv && 0 < upRequireSkillInfo.slv) {
          affectedLv = upRequireSkillInfo.lv + (toLv - 1) * upRequireSkillInfo.slv;
          result.push({
            id: skill.id,
            lv: affectedLv
          });
        }
      }
    }
    return result;
  };

  /*
  	現在習得しているすべてのスキルの状態に必要なキャラクターレベルを返す
  */
  Simulator.prototype.getAllRequireCharacterLv = function() {
    var lv, requireCharacterLv, requireCharacterLvList, result, skill, skillId, _i, _len, _ref;
    requireCharacterLvList = [0];
    _ref = this.state.skills;
    for (skillId in _ref) {
      lv = _ref[skillId];
      skill = this.getSkill(skillId);
      requireCharacterLv = skill.requireCharacterLvs[lv - 1];
      if (0 < requireCharacterLv) {
        requireCharacterLvList.push(requireCharacterLv);
      }
    }
    result = 0;
    for (_i = 0, _len = requireCharacterLvList.length; _i < _len; _i++) {
      lv = requireCharacterLvList[_i];
      if (result < lv) {
        result = lv;
      }
    }
    return result;
  };

  return Simulator;

})();

/*
シミュレーターアプリのビュー
*/
View = (function() {

  /*
	初期化
  */
  function View(simulator) {

    this.onReset = __bind(this.onReset, this);

    this.onChangeSkillPoint = __bind(this.onChangeSkillPoint, this);

    this.onChangeCharacterLv = __bind(this.onChangeCharacterLv, this);

    this.onChangeSkillLv = __bind(this.onChangeSkillLv, this);

    this.onUnlearnSkill = __bind(this.onUnlearnSkill, this);

    this.onLearnSkill = __bind(this.onLearnSkill, this);

    this.onSetTree = __bind(this.onSetTree, this);

    this.onSetClass = __bind(this.onSetClass, this);
    this.dispClassName = "";	// 2013.12.26 タイトルにクラス名を入れるため追加。表示領域のDOM作ってもいいかも

    this.simulator = simulator;
    $(document).on({
      'setClass.simulator': this.onSetClass,
      'setTree.simulator': this.onSetTree,
      'learnSkill.simulator': this.onLearnSkill,
      'unlearnSkill.simulator': this.onUnlearnSkill,
      'changeSkillLv.simulator': this.onChangeSkillLv,
      'changeCharacterLv.simulator': this.onChangeCharacterLv,
      'changeSkillPoint.simulator': this.onChangeSkillPoint,
      'reset.simulator': this.onReset
    });
  }

  View.prototype.dispClassNameTable = {1: '戰士', 2: '騎士', 3: '法師', 4: '遊俠', 5: '督軍', 6: '劍鬥士', 7: '聖殿騎士', 8: '武術家', 9: '魔導士', 10: '吟遊詩人', 11: '寶藏獵人', 12: '神槍手', 13: '工程師', 14: '機甲師', 15: '龍騎兵', 16: '劍聖', 17: '神騎士', 18: '宗師', 19: '元素使', 20: '演奏家', 21: '神射手', 22: '狙擊手', 23: '操控師', 24: '魂之勇者', 25: '劍刃舞者', 26: '恐懼騎士', 27: '鬥神', 28: '幻術師', 29: '音樂大師', 30: '忍者大師', 31: '審判者', 32: '改造大師', 33: '靈魂破壞者', 34: '靈魂掠奪者', 35: '靈魂統治者', 36: '天之王者', 37: '幻武劍豪', 38: '創世主', 39: '諸神使者', 40: '大毀滅者', 41: '流行天王', 42: '風之潛行者', 43: '裁決射手', 44: '究極兵甲', 45: '弒魂者', 46: '卡片大師', 47: '高階大師', 48: '神聖大師', 49: '弧形大師', 50: '決鬥大師', 51: '黑暗大師', 52: '暴力大師', 53: '浪人劍客', 54: '狂刃武士', 55: '黑狼武士', 56: '闇影武士', 57: '修道士', 58: '對戰大師', 59: '復仇者', 60: '混血天神', 61: '傭兵', 62: '火焰大師', 63: '喚焱者', 64: '炙焰天', 65: '擊劍士', 66: '終結者', 67: '劍極大師', 68: '黑暗追擊者', 69: '寶石之星', 70: '槍兵', 71: '黑暗騎士', 72: '和平使者', 73: '暗影行者'};


  /*
  	職業を設定する
  */
  View.prototype.onSetClass = function(e, args) {
    var counter, tree, treeId, _ref, _results;
    counter = 0;
    $('#tree-tabs').empty();
    _ref = args.trees;
    _results = [];
    var i=0;
    for (treeId in _ref) {
      tree = _ref[treeId];

      // 2013.12.21 ノード名が???だったら表示しない
      if (tree.name == "???") { continue; }

      if (!$("[data-tree-id=" + treeId + "]").size()) {
        this.renderSkillTree(tree);
      }
      $('#tree-tabs').append("<li data-tree-id=\"" + treeId + "\">" + tree.name + "</li>");
      if (counter === 0) {
        this.simulator.setTree(treeId);
      }
      _results.push(counter += 1);
    }

//    // 2013.12.26 クラスが確定した時点で表示用のクラス名を覚えておく
//    this.dispClassName = dispClassNameTable[this.simulator.state.classId];

    // 2013.12.26 サブクラスの場合はスキルポイント部分の背景色を変える
    if (this.simulator.state.baseSpRatio == 1) {
      // 1Lv→1sp いつもの見た目で
      $('#skill-point-box').css({
        'background' : '#fff'
      });
    } else {
      // 1Lv→1sp ではないので、すこし見栄えを変える
      $('#skill-point-box').css({
        'background' : '#eff'
      });
    }

    return _results;
  };

  /*
  	スキルツリーを設定する
  */
  View.prototype.onSetTree = function(e, args) {
    $('#tree-tabs li').removeClass('active');
    $("#tree-tabs li[data-tree-id=" + args.tree.id + "]").addClass('active');
    $('.tree').hide();
    return $(".tree[data-tree-id=" + args.tree.id + "]").show();
  };

  /*
  	スキルを習得すみ状態にする
  */
  View.prototype.onLearnSkill = function(e, args) {

    // 習得済スキルを強調してみる
    $("[data-skill-id=" + args.skillId + "] .skill-name").css({
      'font-weight' : 'bold',
      'color' : '#0000FF'
    });

    return $("[data-skill-id=" + args.skillId + "] .disable-shadow").css({
      visibility: 'hidden'
    });
  };

  /*
  	スキルを未習得状態にする
  */
  View.prototype.onUnlearnSkill = function(e, args) {

    // 習得済スキルの強調を解除
    $("[data-skill-id=" + args.skillId + "] .skill-name").css({
      'font-weight' : 'normal',
      'color' : '#000000'
    });

    return $("[data-skill-id=" + args.skillId + "] .disable-shadow").css({
      visibility: 'visible'
    });
  };

  /*
  	スキルのレベルを変更する
  */
  View.prototype.onChangeSkillLv = function(e, args) {
    return $("[data-skill-id=" + args.skill.id + "] .skill-lv-change").html(this.renderSkillLvChangeButton(args.lv, args.skill.maxLv));
  };

  /*
  	キャラクターレベルを変更する
  */
  View.prototype.onChangeCharacterLv = function(e, args) {
    var ret = $('#character-lv').text(args.lv);
//    if (ret) {
//      document.title = "[LataleSkill]Lv" + args.lv + " " + this.dispClassName;
//    }
    return ret;
  };

  /*
  	スキルポイントを変更する
  */
  View.prototype.onChangeSkillPoint = function(e, args) {
    var leftSkillPoint;
    leftSkillPoint = args.base + args.bonus - args.consumption;
    $('#skill-point').text(leftSkillPoint);
    return $('#skill-point-detail').text("" + args.base + "(+" + args.bonus + ")-" + args.consumption + " = " + leftSkillPoint);
  };

  /*
  	リセットする
  */
  View.prototype.onReset = function(e, args) {};

  /*
  	スキルツリーをレンダリングする
  */
  View.prototype.renderSkillTree = function(tree) {
    var gridElement, i, k, rowElement, skill, skillId, treeElement, treeTableElement, _i, _j, _ref, _results;
    treeElement = $('<div />').addClass('tree').attr('data-tree-id', tree.id);
    treeTableElement = $('<table />').appendTo(treeElement);
    for (i = _i = 1; _i <= 20; i = ++_i) {
      rowElement = $('<tr />').appendTo(treeTableElement);
      for (k = _j = 1; _j <= 6; k = ++_j) {
        $('<td />').appendTo(rowElement);
      }
    }
    $('#trees').append(treeElement);
    _ref = tree.skills;
    _results = [];
    for (skillId in _ref) {
      skill = _ref[skillId];
      gridElement = $(".tree[data-tree-id=" + tree.id + "] td").eq(skill.gridIndex - 1);
      _results.push(gridElement.html(this.renderSkill(skill, 0)));
    }
    return _results;
  };

  /*
  	スキルのHTMLをレンダリングする
  */
  View.prototype.renderSkill = function(skill, lv) {
    return "<div class=\"skill\" data-skill-id=\"" + skill.id + "\">\n	<div style=\"float:left\">" + (this.renderSkillIcon(skill.icon.id, skill.icon.index)) + "</div>\n	<div style=\"float:left; line-height: 32px\"><span class=\"skill-name\">" + skill.name + "</span></div>\n	<div class=\"skill-lv-change\" style=\"clear:both\">" + (this.renderSkillLvChangeButton(lv, skill.maxLv)) + "</div>\n</div>";
  };

  /*
  	スキルアイコンのHTMLをレンダリングする
  */
  View.prototype.renderSkillIcon = function(iconId, iconIndex) {
    var iconLeft, iconTop;
    iconLeft = -1 * (iconIndex - 1) % 16 * 32;
    iconTop = -1 * Math.floor((iconIndex - 1) / 16) * 32;

    /* 2013.12.21 アイコンIDからリソース名に変換して使用 */
//    return "<span class=\"icon\" style=\"background: url(images/icons/" + iconId + ".png) " + iconLeft + "px " + iconTop + "px\"><span class=\"disable-shadow\"></span></span>";
    var iconFileName = iconId + ".PNG";
    iconFileName = iconFileName.replace("100030", "SKILL_ICON");
    return "<span class=\"icon\" style=\"background: url(images/icons/" + iconFileName + ") " + iconLeft + "px " + iconTop + "px\"><span class=\"disable-shadow\"></span></span>";
  };

  /*
  	スキルレベル変更ボタンをレンダリングする
  */
  View.prototype.renderSkillLvChangeButton = function(lv, maxLv) {
    var content, i, _i;
    content = '';
    for (i = _i = 1; 1 <= maxLv ? _i <= maxLv : _i >= maxLv; i = 1 <= maxLv ? ++_i : --_i) {
      content += "<span class=\"skill-lv-change-button " + (i <= lv ? 'active' : '') + "\" data-change-skill-lv=\"" + i + "\">" + i + "</span>";
    }
    return content;
  };

  /*
  	スキルの説明をレンダリングする
  */
  View.prototype.renderSkillDescription = function(skill) {
    var content, currentLv, requireSkillInfo, _i, _len, _ref, _ref1;
    content = "<p>" + skill.description + "</p>\n<p>&nbsp;</p>\n<p>[等级要求Lv]</p>\n<p>" + (skill.requireCharacterLvs.join('/')) + "</p>";
    if (0 < skill.requireSkills.length) {
      content += "<p>&nbsp;</p><p>[前置技能要求]</p><ul>";
      currentLv = (_ref = skill.id, __indexOf.call(this.simulator.state.skills, _ref) >= 0) ? this.simulator.state.skills[skill.id] : 0;
      _ref1 = skill.requireSkills;
      for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
        requireSkillInfo = _ref1[_i];
        skill = this.simulator.getSkill(requireSkillInfo.id);
        content += "<li>" + skill.name + " Lv." + requireSkillInfo.lv + "</li>";
      }
      content += "</ul>";
    }
    return content;
  };

  return View;

})();

/*
メイン部
*/
$(function() {
  var checkBoxCount, checkedList, data, i, pairData, readCounter, readData, serialData, sim, skillId, skillLv, state, url, view, _i, _j, _ref, _ref1;
  sim = new Simulator;
  view = new View(sim);

  /*
  	職業カテゴリーにカーソルを合わせると
  	職業リストをサブメニューとして表示する
  */
  $('#class-category-menu li').on('mouseover mouseout', function(e) {
    var subMenuElement;
    subMenuElement = $(this).children('.class-menu');
    switch (e.type) {
      case 'mouseover':
        return subMenuElement.width($(this).width()).css({
          'left': 0,
          'top': $(this).height()
        }).show();
      case 'mouseout':
        return subMenuElement.hide();
    }
  });

  /*
  	職業が選択された時のハンドラ
  */
  $('.class-menu li[data-class-id]').on('click', function() {
    var classId;
    classId = Number($(this).attr('data-class-id'));
    return sim.setClass(classId);
  });

  /*
  	スキルツリーが選択された時のハンドラ
  */
  $('#tree-tabs li[data-tree-id]').live('click', function() {
    var treeId;
    treeId = Number($(this).attr('data-tree-id'));
    return sim.setTree(treeId);
  });

  /*
  	スキルアイコンに関するハンドラ
  */
  $('.icon').live('mouseover mouseout mousemove click', function(e) {
    var left, skillId, tipElement, top;
    skillId = Number($(this).parents('[data-skill-id]').attr('data-skill-id'));
    tipElement = $('.tip');
    tipElement.html(view.renderSkillDescription(sim.getSkill(skillId)));
    left = e.pageX + 5;
    top = e.pageY + 5;
    if (e.clientY > $(window).height() / 2) {
      top -= tipElement.height() + 20;
    }
    switch (e.type) {
      case 'mouseover':
        return tipElement.show();
      case 'mouseout':
        return tipElement.html('').hide();
      case 'mousemove':
        return tipElement.css({
          left: left,
          top: top
        });
      case 'click':
        return sim.toggleSkillLearned(skillId);
    }
  });

  /*
  	スキルレベル変更ボタンに関するハンドラ
  */
  $('.skill-lv-change-button').live('click', function() {
    var changingSkillLv, skillId;
    skillId = Number($(this).parents('[data-skill-id]').attr('data-skill-id'));
    changingSkillLv = Number($(this).attr('data-change-skill-lv'));
    return sim.changeSkillLv(skillId, changingSkillLv);
  });

  /*
  	リセットボタンに関するハンドラ
  */
  $('.reset-button').on('click', function() {
    return sim.reset();
  });

  /*
  	ボーナスチェックボックスに関するハンドラ
  */
  $('input.bonus-point-checkbox').on('change', function() {
    var bonusPoint, isChecked;
    isChecked = $(this).attr('checked');
    bonusPoint = Number($(this).attr('data-bonus-point'));
    return sim.addBonusSkillPoint(isChecked ? bonusPoint : -1 * bonusPoint);
  });

  /*
  	URL出力ボタンに関するハンドラ
  */
  $('#url-button').on('click', function() {
    var checksResult, data, lv, result, skillId, skillsResult, value, _i, _len, _ref;
    const site = window.location.origin
    result = site + "/?q="; 
    data = [sim.state.characterLv, sim.state.baseSp, sim.state.bonusSp, sim.state.consumptionSp, sim.state.classId, sim.state.treeId];
    for (_i = 0, _len = data.length; _i < _len; _i++) {
      value = data[_i];
      result += parseInt(value).toString(36);
      result += ',';
    }
    checksResult = [];
    $('.bonus-point-checkbox').each(function() {
      return checksResult.push($(this).attr('checked') ? 1 : 0);
    });
    result += checksResult.join(',');
    result += ',';
    skillsResult = [];
    _ref = sim.state.skills;
    for (skillId in _ref) {
      lv = _ref[skillId];
      skillId = Number(skillId);
      skillsResult.push("" + (skillId.toString(36)) + ":" + (lv.toString(36)));
    }
    result += skillsResult.join(',');
    return $('#url-textarea').text(result);
  });

  /*
  	URLをtextareaから読み込み
  	→Webサーバ上にデプロイしない為、URLクエリ文字列を使わずに読み込める手段を準備。
  	  →結局Webサーバ上にあげたけど、古いリンクとかも使えるからいいか・・・
  */
  $('#url-button-load').on('click', function() {
    urltext = $('#url-textarea').text();
    
    // とりあえずベタにパース
    var elem;
    var hashmap = []; 
    var params = urltext.slice(urltext.indexOf('?') + 1).split('&'); 
    for(var i = 0; i < params.length; i++) { 
        elem = params[i].split('='); 
        hashmap.push(elem[0]); 
        hashmap[elem[0]] = elem[1]; 
    } 
    serialData = hashmap['q'];

    $('#url-textarea').text(""); // 読み込んだら消しとく

    // 2013.12.22 bonusSpが二重計上される対策
    sim.state.bonusSp = 0;
//    for (i = 0; i < checkBoxCount; i++) {
//      $('.bonus-point-checkbox').eq(i).attr('checked', false);
//    }
//    sim.reset();  //念のため

    loadSerialData(serialData);
  });


  /*
  	URL入出力エリア
  */
  $('#url-textarea').on('focus', function() {
    var _this = this;
    $(this).select();
    return $(this).on('mouseup', function() {
      $(_this).unbind('mouseup');
      return false;
    });
  });
  $('.tree').show();

  /*
  	URLパラメータを認識してセット
  */
  loadSerialData = function(serialData) {
    if (serialData) {
      data = serialData.split(',');
      readCounter = 0;
      readData = function() {
        var result;
        result = data[readCounter];
        readCounter++;
        return result;
      };
      state = new State;
      state.characterLv = parseInt(readData(), 36);
      state.baseSp = parseInt(readData(), 36);
      state.bonusSp = parseInt(readData(), 36);
      state.consumptionSp = parseInt(readData(), 36);
      state.classId = parseInt(readData(), 36);
      state.treeId = parseInt(readData(), 36);
      checkBoxCount = $('.bonus-point-checkbox').size();
      checkedList = (function() {
        var _i, _results;
        _results = [];
        for (i = _i = 0; 0 <= checkBoxCount ? _i < checkBoxCount : _i > checkBoxCount; i = 0 <= checkBoxCount ? ++_i : --_i) {
          _results.push(Number(readData()));
        }
        return _results;
      })();
      for (i = _i = 0; 0 <= checkBoxCount ? _i < checkBoxCount : _i > checkBoxCount; i = 0 <= checkBoxCount ? ++_i : --_i) {
        if (checkedList[i] === 1) {
          $('.bonus-point-checkbox').eq(i).attr('checked', true);
        }
      }
      for (i = _j = _ref = 7 + checkBoxCount, _ref1 = data.length; _ref <= _ref1 ? _j <= _ref1 : _j >= _ref1; i = _ref <= _ref1 ? ++_j : --_j) {
        pairData = readData().split(':');
        skillId = parseInt(pairData[0], 36);
        skillLv = parseInt(pairData[1], 36);
        state.skills[skillId] = skillLv;
      }
      return sim.setState(state);
    }
  };


  url = $.url();
  serialData = url.param('q');
  if (serialData) {
    loadSerialData(serialData);
    
    //タイトル表示の為、Lvともっかい読み込み
    {
      var data = serialData.split(',');
      var readCounter = 0;
      var readData = function() {
        var result;
        result = data[readCounter];
        readCounter++;
        return result;
      };
      var characterLv = parseInt(readData(), 36);
      parseInt(readData(), 36);
      parseInt(readData(), 36);
      parseInt(readData(), 36);
      var classId = parseInt(readData(), 36);

      document.title = "[LataleSkill]Lv" + characterLv + " " + view.dispClassNameTable[classId];
    }
  }

});
