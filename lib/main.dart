import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/date_symbol_data_local.dart';

import 'app/gymmane_app.dart';
import 'models/workout.dart';
import 'services/alarm_store.dart';
import 'services/auth_service.dart';
import 'services/auto_backup.dart';
import 'services/device_kind.dart';
import 'services/home_widget_bridge.dart';
import 'services/nutrition_widgets.dart';
import 'services/live_workout.dart';
import 'services/local_store.dart';
import 'services/media_store.dart';
import 'services/app_icon.dart';
import 'services/nfc_tags.dart';
import 'services/graphics_mode.dart';
import 'services/rest_alarm.dart';
import 'services/screen_awake.dart';
import 'state/fit_state.dart';
import 'services/quick_tiles.dart';
import 'services/watch_phone.dart';
import 'wear/wear_app.dart';
import 'wear/wear_surfaces.dart';
import 'wear/wear_sync.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    systemNavigationBarColor: Colors.transparent,
    systemNavigationBarDividerColor: Colors.transparent,
    systemNavigationBarContrastEnforced: false,
    systemStatusBarContrastEnforced: false,
  ));

  await initializeDateFormatting();
  await Store.instance.init();
  await AuthService.instance.init();
  await MediaStore.init();
  await AlarmStore.init();
  await RestAlarm.instance.init();
  GraphicsMode.load();
  AppIcon.load();
  fit.loadFromStore();
  if (kIsWeb) _seedWebDemoIfEmpty();
  NfcTags.load();
  fit.syncPhotoReminder();
  fit.syncMeasureReminder();
  fit.syncTrainReminder();

  final watch = await DeviceKind.isWatch();
  _onWatch = watch;
  fit.addListener(_sessionSideEffects);
  _sessionSideEffects();

  if (watch) {
    WearSurfaces.watch();
    unawaited(WearSync.instance.init());
    runApp(const WearApp());
    GraphicsMode.watchFirstFrame();
    return;
  }

  fit.onWidgetsShouldUpdate = HomeWidgetBridge.update;
  NutritionWidgets.watch(HomeWidgetBridge.update);
  AutoBackup.instance.init();
  unawaited(WatchPhone.init());
  unawaited(QuickTiles.init());
  runApp(const GymManeApp());

  GraphicsMode.watchFirstFrame();
  WidgetsBinding.instance.addPostFrameCallback((_) => HomeWidgetBridge.update());
}

bool _onWatch = false;

void _sessionSideEffects() {
  if (!_onWatch) LiveWorkout.sync();
  final live = fit.isSessionActive && fit.session?.manual == false;
  ScreenAwake.keepOn(fit.keepScreenOn && live);
}

void _seedWebDemoIfEmpty() {
  if (fit.onboarded || fit.sessions.isNotEmpty || fit.routines.isNotEmpty) return;
  final push = Routine(
    'demo-push',
    'Push Power',
    ['EIeI8Vf', 'ns0SIbU', 'kTbSH9h', 'DsgkuIt', '3ZflifB'],
    sets: {'EIeI8Vf': 4, 'ns0SIbU': 3, 'kTbSH9h': 3, 'DsgkuIt': 3, '3ZflifB': 3},
  );
  final pull = Routine(
    'demo-pull',
    'Pull & Arms',
    ['72BC5Za', '25GPyDY'],
    sets: {'72BC5Za': 4, '25GPyDY': 3},
  );
  final legs = Routine(
    'demo-legs',
    'Leg Strength',
    ['qXTaZnJ', 'wQ2c4XD', '7zdxRTl'],
    sets: {'qXTaZnJ': 4, 'wQ2c4XD': 3, '7zdxRTl': 3},
  );
  fit.routines
    ..add(push)
    ..add(pull)
    ..add(legs);
  fit.weeklyPlan[1] = push.id;
  fit.weeklyPlan[3] = pull.id;
  fit.weeklyPlan[5] = legs.id;

  final now = DateTime.now();
  fit.sessions.addAll([
    LoggedSession(
      now.subtract(const Duration(days: 1)),
      3120,
      [
        LoggedExercise('EIeI8Vf', 'Barbell Bench Press', 'chest', [
          LoggedSet(8, 70),
          LoggedSet(8, 75),
          LoggedSet(6, 80),
          LoggedSet(6, 80),
        ]),
        LoggedExercise('ns0SIbU', 'Dumbbell Incline Bench Press', 'chest', [
          LoggedSet(10, 26),
          LoggedSet(10, 28),
          LoggedSet(9, 28),
        ]),
        LoggedExercise('DsgkuIt', 'Dumbbell Lateral Raise', 'shoulders', [
          LoggedSet(14, 10),
          LoggedSet(14, 12),
          LoggedSet(12, 12),
        ]),
      ],
      routineId: push.id,
      name: push.name,
    ),
    LoggedSession(
      now.subtract(const Duration(days: 3)),
      3480,
      [
        LoggedExercise('qXTaZnJ', 'Barbell Full Squat', 'quads', [
          LoggedSet(8, 90),
          LoggedSet(6, 100),
          LoggedSet(6, 105),
          LoggedSet(5, 110),
        ]),
        LoggedExercise('wQ2c4XD', 'Barbell Romanian Deadlift', 'hamstrings', [
          LoggedSet(10, 80),
          LoggedSet(10, 85),
          LoggedSet(8, 90),
        ]),
        LoggedExercise('7zdxRTl', 'Leg Press', 'quads', [
          LoggedSet(12, 160),
          LoggedSet(12, 180),
          LoggedSet(10, 190),
        ]),
      ],
      routineId: legs.id,
      name: legs.name,
    ),
    LoggedSession(
      now.subtract(const Duration(days: 5)),
      2760,
      [
        LoggedExercise('72BC5Za', 'Archer Pull Up', 'back', [
          LoggedSet(8, 0),
          LoggedSet(8, 0),
          LoggedSet(7, 0),
        ]),
        LoggedExercise('25GPyDY', 'Barbell Curl', 'biceps', [
          LoggedSet(10, 30),
          LoggedSet(10, 32.5),
          LoggedSet(8, 35),
        ]),
      ],
      routineId: pull.id,
      name: pull.name,
    ),
  ]);
  fit.bodyweight.addAll([
    BodyweightEntry(now.subtract(const Duration(days: 14)), 76.2),
    BodyweightEntry(now.subtract(const Duration(days: 7)), 75.8),
    BodyweightEntry(now.subtract(const Duration(days: 1)), 75.4),
  ]);
  fit.onboarded = true;
  fit.persistNow();
}
