import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:smitrix/screens/login_screen.dart';
import 'package:smitrix/services/auth_service.dart';
import 'package:smitrix/theme/app_theme.dart';

void main() {
  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    AuthService.instance.forceRequireLoginForTest = null;
    await AuthService.instance.signOut();
  });

  tearDown(() async {
    AuthService.instance.forceRequireLoginForTest = null;
    await AuthService.instance.signOut();
  });

  group('AuthUser', () {
    test('serializes to and from JSON with admin and initials', () {
      const user = AuthUser(
        uid: 'u123',
        email: 'smitronix0826@gmail.com',
        displayName: 'Asmit Jogdand',
        idToken: 'tok',
        refreshToken: 'ref',
        expiresAtMs: 9999999999999,
      );
      final restored = AuthUser.fromJson(user.toJson());
      expect(restored.uid, 'u123');
      expect(restored.email, 'smitronix0826@gmail.com');
      expect(restored.displayName, 'Asmit Jogdand');
      expect(restored.isAdmin, isTrue);
      expect(restored.isSignedIn, isTrue);
      expect(restored.initials, 'AJ');
    });

    test('guest user is not admin and has Offline Athlete label', () {
      const guest = AuthUser(
        uid: 'offline',
        email: '',
        displayName: '',
        idToken: '',
        refreshToken: '',
        expiresAtMs: 0,
        isGuest: true,
      );
      expect(guest.isGuest, isTrue);
      expect(guest.isAdmin, isFalse);
      expect(guest.isSignedIn, isFalse);
      expect(guest.label, 'Offline Athlete');
      expect(guest.initials, 'OA');
    });
  });

  group('AuthService', () {
    test('maps Firebase error codes to readable messages', () {
      expect(
        AuthService.friendlyError('INVALID_LOGIN_CREDENTIALS'),
        contains('Incorrect email or password'),
      );
      expect(
        AuthService.friendlyError('EMAIL_EXISTS'),
        contains('already exists'),
      );
      expect(
        AuthService.friendlyError('WEAK_PASSWORD : Password should be at least 6 characters'),
        contains('too weak'),
      );
      expect(
        AuthService.friendlyError('NETWORK'),
        contains('internet connection'),
      );
    });

    test('enforces login gate when required and clears after offline mode', () async {
      AuthService.instance.forceRequireLoginForTest = true;
      expect(AuthService.instance.requiresLogin, isTrue);

      await AuthService.instance.continueOffline(name: 'Asmit');
      expect(AuthService.instance.requiresLogin, isFalse);
      expect(AuthService.instance.isGuest, isTrue);

      await AuthService.instance.signOut();
      expect(AuthService.instance.requiresLogin, isTrue);
    });
  });

  group('LoginScreen widget', () {
    testWidgets('shows Google/Apple buttons, animates sliding tabs on tap and drag, and allows offline', (tester) async {
      tester.view.physicalSize = const Size(430, 932);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.reset);

      AuthService.instance.forceRequireLoginForTest = true;
      await tester.pumpWidget(MaterialApp(
        theme: AppTheme.dark,
        home: const LoginScreen(),
      ));

      expect(find.text('SmiTriX'), findsOneWidget);
      expect(find.text('Sign In'), findsNWidgets(2));
      expect(find.text('Create Account'), findsOneWidget);
      expect(find.text('Google'), findsOneWidget);
      expect(find.text('Apple'), findsOneWidget);

      await tester.tap(find.text('Create Account'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 220));
      await tester.pumpAndSettle();
      expect(find.text('DISPLAY NAME'), findsOneWidget);

      // Swipe back left on the sliding bar to switch back to Sign In mode.
      await tester.drag(find.text('Create Account').first, const Offset(-180, 0));
      await tester.pumpAndSettle();
      expect(find.text('DISPLAY NAME'), findsNothing);

      final offlineBtn = find.text('Continue Offline (Device Only)');
      await tester.ensureVisible(offlineBtn);
      await tester.pumpAndSettle();
      await tester.tap(offlineBtn);
      await tester.pumpAndSettle();
      expect(AuthService.instance.isGuest, isTrue);
      expect(AuthService.instance.requiresLogin, isFalse);
    });
  });
}
