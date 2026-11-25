import 'dart:io' show Platform;

import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/widgets.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:intl/intl.dart';

import 'app_localizations.dart';
import 'catalog_es.dart';
import 'catalog_it.dart';
import 'catalog_pt.dart';
import 'catalog_vi.dart';
import 'catalog_zh.dart';

export 'app_localizations.dart';

final Map<String, String> _decimalSeparators = {};

String get decimalSeparator => _decimalSeparators.putIfAbsent(intlLocale, () {
      final sep = NumberFormat.decimalPattern(intlLocale).symbols.DECIMAL_SEP;
      return sep == '٫' ? '.' : sep;
    });

String decimalText(String s) => s.replaceFirst('.', decimalSeparator);

const Set<String> kRtlLanguages = {'ar', 'fa', 'ur'};

bool get isRtlLanguage => kRtlLanguages.contains(appLanguage);

String ltr(String s) => isRtlLanguage ? '\u2066$s\u2069' : s;

final _grouped = <String, NumberFormat>{};

String groupedInt(int n) {
  final locale = appLanguage == 'fa' || appLanguage == 'bn' ? 'en' : intlLocale;
  return (_grouped[locale] ??= NumberFormat.decimalPattern(locale)).format(n);
}

const Map<String, Map<String, String>> _catalogNames = {'es': kExerciseNameEs, 'it': kExerciseNameIt, 'pt': kExerciseNamePt, 'zh': kExerciseNameZh};
const Map<String, Map<String, List<String>>> _catalogSteps = {'es': kExerciseStepsEs, 'it': kExerciseStepsIt, 'pt': kExerciseStepsPt, 'vi': kExerciseStepsVi, 'zh': kExerciseStepsZh};

String appLanguage = 'en';
AppLocalizations t = lookupAppLocalizations(const Locale('en'));

String health(String text) => !kIsWeb && Platform.isIOS ? text.replaceAll('Health Connect', 'Apple Health') : text;

String _codeOf(Locale l) => l.scriptCode == null ? l.languageCode : '${l.languageCode}_${l.scriptCode}';

List<String> get appLanguages => AppLocalizations.supportedLocales.map(_codeOf).toList();

Locale localeOf(String code) {
  final parts = code.split('_');
  return parts.length > 1
      ? Locale.fromSubtags(languageCode: parts.first, scriptCode: parts[1])
      : Locale(code);
}

String languageNameOf(String code) => lookupAppLocalizations(localeOf(code)).languageName;

String get intlLocale => appLanguage == 'zh_Hant' ? 'zh_TW' : appLanguage;

String resolveLanguage(String code) {
  if (appLanguages.contains(code)) return code;
  final parts = code.toLowerCase().split(RegExp('[-_]'));
  final base = parts.first;
  if (base == 'zh' && parts.skip(1).any(const {'hant', 'tw', 'hk', 'mo'}.contains)) return 'zh_Hant';
  return appLanguages.contains(base) ? base : 'en';
}

void setAppLanguage(String code) {
  appLanguage = resolveLanguage(code);
  t = lookupAppLocalizations(localeOf(appLanguage));
  Intl.defaultLocale = intlLocale;
}

bool _dateSymbolsReady = false;

DateFormat _dates(DateFormat Function(String locale) build) {
  if (!_dateSymbolsReady) {
    initializeDateFormatting();
    _dateSymbolsReady = true;
  }
  return build(intlLocale);
}

extension GymL10n on AppLocalizations {
  String finishHeadline({required int prs, required int streak, required bool goalHit}) {
    if (prs > 0) return finishHeadlinePr;
    if (goalHit) return finishHeadlineGoal;
    if (streak >= 3) return finishHeadlineStreak;
    return finishHeadlineDefault;
  }

  String finishBody({required int prs, required int streak, required bool goalHit}) {
    if (prs > 0) return finishBodyPr(prs);
    if (goalHit) return finishBodyGoal;
    if (streak >= 3) return finishBodyStreak(streak);
    return finishBodyDefault;
  }

  String vsLastMonth(int pct) => vsLastMonthLabel('${pct >= 0 ? '+' : ''}$pct');

  String levelStreak(int level, int streak) => levelStreakLabel(level, streakDays(streak));

  String toolName(String id) => switch (id) {
        'rm' => toolNameRm,
        'bmi' => toolNameBmi,
        'cal' => toolNameCal,
        'bf' => toolNameBf,
        'plate' => toolNamePlate,
        'rpe' => toolNameRpe,
        'dots' => toolNameDots,
        'wilks' => toolNameWilks,
        'ffmi' => toolNameFfmi,
        'protein' => toolNameProtein,
        'water' => toolNameWater,
        _ => toolNameWarmup,
      };

  String toolTitle(String id) => switch (id) {
        'rm' => toolTitleRm,
        'bmi' => toolTitleBmi,
        'cal' => toolTitleCal,
        'bf' => toolTitleBf,
        'plate' => toolTitlePlate,
        'rpe' => toolTitleRpe,
        'dots' => toolTitleDots,
        'wilks' => toolTitleWilks,
        'ffmi' => toolTitleFfmi,
        'protein' => toolTitleProtein,
        'water' => toolTitleWater,
        _ => toolTitleWarmup,
      };

  String toolResultHint(String id) => switch (id) {
        'rm' => toolHintRm,
        'cal' => toolHintCal,
        'bf' => toolHintBf,
        'plate' => toolHintPlate,
        'protein' => toolHintProtein,
        'water' => toolHintWater,
        _ => toolHintWarmup,
      };

  String templateBlurb(String id) => switch (id) {
        'fullbody' => tplFullbody,
        'ppl' => tplPpl,
        'arnold' => tplArnold,
        'upperlower' => tplUpperlower,
        'abcd' => tplAbcd,
        'abcde' => tplAbcde,
        'stronglifts' => tplStronglifts,
        'startingstrength' => tplStartingstrength,
        'rr' => tplRr,
        _ => tplHome,
      };

  String toolDesc(String id) => switch (id) {
        'rm' => toolDescRm,
        'bmi' => toolDescBmi,
        'cal' => toolDescCal,
        'bf' => toolDescBf,
        'plate' => toolDescPlate,
        'rpe' => toolDescRpe,
        'dots' => toolDescDots,
        'wilks' => toolDescWilks,
        'ffmi' => toolDescFfmi,
        'protein' => toolDescProtein,
        'water' => toolDescWater,
        _ => toolDescWarmup,
      };

  String dotsLevelName(int level) => switch (level) {
        0 => dotsLevel0,
        1 => dotsLevel1,
        2 => dotsLevel2,
        3 => dotsLevel3,
        _ => dotsLevel4,
      };

  String ffmiLevelName(int level) => switch (level) {
        0 => ffmiLevel0,
        1 => ffmiLevel1,
        2 => ffmiLevel2,
        3 => ffmiLevel3,
        _ => ffmiLevel4,
      };

  String bmiCategory(String key) => switch (key) {
        'Underweight' => bmiUnderweight,
        'Normal' => bmiNormal,
        'Overweight' => bmiOverweight,
        _ => bmiObese,
      };

  String activityName(String key) => switch (key) {
        'Sedentary' => actSedentary,
        'Light' => actLight,
        'Active' => actActive,
        _ => actModerate,
      };

  String muscle(String id) => switch (id) {
        'chest' => muscleChest,
        'back' => muscleBack,
        'lowerback' => muscleLowerBack,
        'shoulders' => muscleShoulders,
        'biceps' => muscleBiceps,
        'triceps' => muscleTriceps,
        'forearm' => muscleForearm,
        'trapezius' => muscleTrapezius,
        'abdomen' => muscleAbdomen,
        'obliques' => muscleObliques,
        'quads' => muscleQuads,
        'hamstrings' => muscleHamstrings,
        'glutes' => muscleGlutes,
        'calves' => muscleCalves,
        _ => id,
      };

  String poseName(String pose) => switch (pose) {
        'front' => poseFront,
        'side' => poseSide,
        _ => poseBack,
      };

  String placePresetName(String preset) => switch (preset) {
        'gym' => placeGym,
        'home' => placeHome,
        _ => placeOutdoors,
      };

  String photoInterval(int days) => days <= 0 ? photoEveryOff : photoEveryDays(days);

  String measureName(String key) => switch (key) {
        'neck' => measureNeck,
        'shoulders' => measureShoulders,
        'chest' => measureChest,
        'arm' => measureArm,
        'forearm' => measureForearm,
        'waist' => measureWaist,
        'abdomen' => measureAbdomen,
        'bp' => measureBp,
        'hips' => measureHips,
        'thigh' => measureThigh,
        'calf' => measureCalf,
        _ => measureBodyfat,
      };

  String muscleGroupName(String key) => switch (key) {
        'Chest' => mgChest,
        'Back' => mgBack,
        'Legs' => mgLegs,
        'Shoulders' => mgShoulders,
        'Arms' => mgArms,
        'Core' => mgCore,
        _ => key,
      };

  String equipment(String id) => switch (id) {
        'Barbell' => equipBarbell,
        'Dumbbell' => equipDumbbell,
        'Cable' => equipCable,
        'Machine' => equipMachine,
        'Bodyweight' => equipBodyweight,
        'Weighted' => equipWeighted,
        'Band' => equipBand,
        'Kettlebell' => equipKettlebell,
        'Rings' => equipRings,
        'Other' => equipOther,
        _ => id.isEmpty ? equipOther : id,
      };

  String exerciseKind(String id) => switch (id) {
        'calisthenics' => kindCalisthenics,
        'cardio' => kindCardio,
        'stretch' => kindStretch,
        'sport' => kindSport,
        _ => kindStrength,
      };

  String difficulty(String id) => switch (id) {
        'Beginner' => diffBeginner,
        'Advanced' => diffAdvanced,
        _ => diffIntermediate,
      };

  String weekday(int w) =>
      _capitalize(_dates(DateFormat.EEEE).format(DateTime(2024, 1, w)));

  String weekdayInline(int w) => _dates(DateFormat.EEEE).format(DateTime(2024, 1, w));

  String weekdayShort(int w) =>
      _capitalize(_dates(DateFormat.E).format(DateTime(2024, 1, w)));

  String weekdayInitial(int w) =>
      _dates((l) => DateFormat('', l)).dateSymbols.NARROWWEEKDAYS[w % 7];

  String monthInitial(int m) =>
      _dates((l) => DateFormat('', l)).dateSymbols.NARROWMONTHS[m - 1];

  String monthShort(int m) =>
      _capitalize(_dates(DateFormat.MMM).format(DateTime(2024, m)).replaceAll('.', ''));

  String monthInline(int m) => _dates(DateFormat.MMMM).format(DateTime(2024, m));

  String monthName(int m) =>
      _capitalize(_dates(DateFormat.MMMM).format(DateTime(2024, m)));

  String monthYear(DateTime d) => _capitalize(_dates(DateFormat.yMMMM).format(d));

  String fullDate(DateTime d) => '${weekday(d.weekday)}, ${shortDateYear(d)}';

  String longDate(DateTime d) => '${weekday(d.weekday)}, ${shortDate(d)}';

  String shortDate(DateTime d) => _dates(DateFormat.MMMd).format(d);

  String clockTime(DateTime d) => _dates(DateFormat.Hm).format(d);

  String shortDateYear(DateTime d) => _dates(DateFormat.yMMMd).format(d);

  String shortMonthYear(DateTime d) => _dates(DateFormat.yMMM).format(d);

  String catalogName(String id, String fallback) => _catalogNames[appLanguage]?[id] ?? fallback;

  List<String> catalogSteps(String id, List<String> fallback) =>
      _catalogSteps[appLanguage]?[id] ?? fallback;
}

extension AuthL10n on AppLocalizations {
  bool get _es => appLanguage == 'es';

  String get authSignIn => _es ? 'Iniciar sesión' : 'Sign In';
  String get authCreateAccount => _es ? 'Crear cuenta' : 'Create Account';
  String get authSigningIn => _es ? 'Iniciando sesión...' : 'Signing In...';
  String get authCreatingAccount => _es ? 'Creando cuenta...' : 'Creating Account...';
  String get authSignInSubtitle => _es
      ? 'Inicia sesión para sincronizar tus entrenos, rutinas y progreso.'
      : 'Sign in to sync your workouts, routines & progress.';
  String get authRegisterSubtitle => _es
      ? 'Crea tu cuenta para respaldar tus entrenos y récords.'
      : 'Create your training account to back up workouts & PRs.';
  String get authDisplayName => _es ? 'Nombre' : 'Display Name';
  String get authEmail => _es ? 'Correo electrónico' : 'Email';
  String get authPassword => _es ? 'Contraseña' : 'Password';
  String get authPasswordHint => _es ? 'Mínimo 6 caracteres' : 'At least 6 characters';
  String get authForgotPassword => _es ? '¿Olvidaste tu contraseña?' : 'Forgot password?';
  String get authResetTitle => _es ? 'Restablecer contraseña' : 'Reset Password';
  String get authResetBody => _es
      ? 'Escribe el correo asociado a tu cuenta de SmiTriX para recibir un enlace de recuperación.'
      : 'Enter the email linked to your SmiTriX account to receive a password reset link.';
  String get authResetSend => _es ? 'Enviar enlace' : 'Send Reset Link';
  String get authResetSending => _es ? 'Enviando...' : 'Sending...';
  String get authResetSentTitle => _es ? 'Correo enviado' : 'Reset email sent';
  String get authResetSentBody => _es
      ? 'Revisa tu bandeja de entrada para crear una nueva contraseña.'
      : 'Check your inbox to set a new password.';
  String get authContinueOffline =>
      _es ? 'Continuar sin conexión (solo dispositivo)' : 'Continue Offline (Device Only)';
  String get authFooterLicense => 'SmiTriX by Asmit Jogdand (SmitroniX) · GNU GPL-3.0';
  String get authOrContinueWith => _es ? 'o continúa con' : 'or continue with';
  String get authGoogle => 'Google';
  String get authApple => 'Apple';
  String get aboutLicenseFooter =>
      '© 2026 Asmit Jogdand (SmitroniX) · GNU GPL v3.0\nBased on GymMane by InlitX (GPL v3.0)';

  String get authSectionTitle => _es ? 'CUENTA Y NUBE' : 'ACCOUNT & CLOUD SYNC';
  String get authAdminBadge => 'ADMIN';
  String get authOfflineMode => _es ? 'Modo sin conexión' : 'Offline Mode';
  String get authOfflineSub => _es ? 'Entrenando localmente en este dispositivo' : 'Training offline on this device';
  String get authSync => _es ? 'Sincronizar' : 'Sync';
  String get authSyncing => _es ? 'Sincronizando' : 'Syncing';
  String get authRestore => _es ? 'Restaurar' : 'Restore';
  String get authSignOut => _es ? 'Salir' : 'Sign Out';
  String get authSignInCloud => _es ? 'Iniciar sesión para sincronizar' : 'Sign In for Cloud Sync';
  String get authSyncSaved => _es ? 'Copia guardada en la nube' : 'Cloud backup saved';
  String get authSyncSavedSub =>
      _es ? 'Tus entrenos y rutinas están respaldados.' : 'Your workouts & routines are backed up.';
  String get authSyncFailed => _es ? 'Error al sincronizar' : 'Sync failed';
  String get authRestoreFailed => _es ? 'Error al restaurar' : 'Restore failed';
  String get authNoCloudBackup => _es ? 'Sin copia en la nube todavía' : 'No cloud backup yet';
  String get authNoCloudBackupSub =>
      _es ? 'Pulsa Sincronizar para subir tus datos primero.' : 'Tap Sync to upload your current data first.';
  String get authRestoreDone => _es ? 'Copia restaurada desde la nube' : 'Cloud backup restored';
  String authSyncedAt(String email, String hhmm) =>
      _es ? '$email · Sinc. $hhmm' : '$email · Synced $hhmm';
}

String _capitalize(String s) => s.isEmpty ? s : s[0].toUpperCase() + s.substring(1);
