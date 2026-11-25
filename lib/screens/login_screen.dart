import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:phosphoricons_flutter/phosphoricons_flutter.dart';

import '../l10n/l10n.dart';
import '../models/profile.dart';
import '../services/auth_service.dart';
import '../state/fit_state.dart';
import '../theme/app_colors.dart';
import '../theme/app_theme.dart';
import '../widgets/liquid_notch.dart';
import '../widgets/ui_kit.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  bool _register = false;
  bool _obscure = true;
  bool _submitting = false;
  String? _error;

  final _name = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_submitting) return;
    HapticFeedback.selectionClick();
    FocusScope.of(context).unfocus();
    setState(() {
      _error = null;
      _submitting = true;
    });

    final auth = AuthService.instance;
    final String? err = _register
        ? await auth.register(_name.text, _email.text, _password.text)
        : await auth.signIn(_email.text, _password.text);

    if (!mounted) return;
    if (err != null) {
      setState(() {
        _error = err;
        _submitting = false;
      });
      return;
    }

    final user = auth.user;
    if (user != null) {
      if (user.displayName.trim().isNotEmpty &&
          (fit.profile.name == kDefaultName || fit.profile.name.trim().isEmpty)) {
        fit.updateProfile(name: user.displayName.trim());
      }
      if (!_register) {
        final pulled = await auth.pullCloudBackup();
        if (pulled.data != null && pulled.data!.isNotEmpty) {
          fit.applyBackup(pulled.data!);
        }
      }
      fit.persistNow();
    }
    if (!mounted) return;
    setState(() => _submitting = false);
  }

  Future<void> _continueOffline() async {
    if (_submitting) return;
    HapticFeedback.selectionClick();
    await AuthService.instance.continueOffline(name: fit.profile.name);
  }

  Future<void> _forgotPassword() async {
    HapticFeedback.selectionClick();
    final ctrl = TextEditingController(text: _email.text.trim());
    String? sheetError;
    bool sending = false;
    final gc = context.gc;

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheetState) => Padding(
          padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(ctx).bottom),
          child: Container(
            padding: sheetPad(ctx),
            decoration: sheetDecoration(gc),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const SheetHandle(),
                const SizedBox(height: 16),
                Text(
                  t.authResetTitle,
                  style: AppTheme.f(21, weight: FontWeight.w800, color: gc.text),
                ),
                const SizedBox(height: 6),
                Text(
                  t.authResetBody,
                  style: AppTheme.f(13.5, weight: FontWeight.w500, color: gc.textSecondary, height: 1.4),
                ),
                const SizedBox(height: 16),
                _inputBox(
                  gc: gc,
                  controller: ctrl,
                  hint: 'you@example.com',
                  icon: PhosphorIconsRegular.envelopeSimple,
                  keyboardType: TextInputType.emailAddress,
                ),
                if (sheetError != null) ...[
                  const SizedBox(height: 10),
                  Text(sheetError!, style: AppTheme.f(12.5, weight: FontWeight.w600, color: gc.danger)),
                ],
                const SizedBox(height: 18),
                PrimaryButton(
                  label: sending ? t.authResetSending : t.authResetSend,
                  onTap: sending
                      ? null
                      : () async {
                          setSheetState(() {
                            sending = true;
                            sheetError = null;
                          });
                          final err = await AuthService.instance.sendPasswordReset(ctrl.text);
                          if (!ctx.mounted) return;
                          if (err != null) {
                            setSheetState(() {
                              sending = false;
                              sheetError = err;
                            });
                            return;
                          }
                          Navigator.of(ctx).pop();
                          if (mounted) {
                            showNotchToast(
                              context,
                              t.authResetSentTitle,
                              subtitle: t.authResetSentBody,
                              icon: PhosphorIconsFill.envelopeSimple,
                              accent: gc.sage,
                            );
                          }
                        },
                ),
              ],
            ),
          ),
        ),
      ),
    );
    ctrl.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final gc = context.gc;
    return Scaffold(
      backgroundColor: gc.bg,
      body: Stack(
        children: [
          Positioned(
            top: -120,
            left: -60,
            right: -60,
            height: 360,
            child: IgnorePointer(
              child: DecoratedBox(
                decoration: BoxDecoration(
                  gradient: RadialGradient(
                    center: const Alignment(0, -0.3),
                    radius: 0.9,
                    colors: [
                      gc.accent.withValues(alpha: 0.22),
                      gc.bg.withValues(alpha: 0),
                    ],
                  ),
                ),
              ),
            ),
          ),
          SafeArea(
            child: Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(22, 24, 22, 28),
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 420),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Center(
                        child: Container(
                          width: 72,
                          height: 72,
                          decoration: BoxDecoration(
                            color: gc.bgRaised,
                            borderRadius: BorderRadius.circular(22),
                            border: Border.all(color: gc.border),
                          ),
                          padding: const EdgeInsets.all(14),
                          child: Image.asset(
                            'assets/img/runner.png',
                            fit: BoxFit.contain,
                            errorBuilder: (_, _, _) => Icon(
                              PhosphorIconsFill.barbell,
                              size: 34,
                              color: gc.accent,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 18),
                      Text(
                        'SmiTriX',
                        textAlign: TextAlign.center,
                        style: AppTheme.f(32, weight: FontWeight.w800, color: gc.text, letterSpacing: -0.8),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        _register ? t.authRegisterSubtitle : t.authSignInSubtitle,
                        textAlign: TextAlign.center,
                        style: AppTheme.f(14, weight: FontWeight.w500, color: gc.textSecondary, height: 1.4),
                      ),
                      const SizedBox(height: 24),
                      _modeTabs(gc),
                      const SizedBox(height: 16),
                      SoftCard(
                        padding: const EdgeInsets.all(18),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            if (_register) ...[
                              _fieldLabel(gc, t.authDisplayName),
                              const SizedBox(height: 6),
                              _inputBox(
                                gc: gc,
                                controller: _name,
                                hint: kDefaultName,
                                icon: PhosphorIconsRegular.user,
                                capitalization: TextCapitalization.words,
                              ),
                              const SizedBox(height: 14),
                            ],
                            _fieldLabel(gc, t.authEmail),
                            const SizedBox(height: 6),
                            _inputBox(
                              gc: gc,
                              controller: _email,
                              hint: 'you@example.com',
                              icon: PhosphorIconsRegular.envelopeSimple,
                              keyboardType: TextInputType.emailAddress,
                            ),
                            const SizedBox(height: 14),
                            _fieldLabel(gc, t.authPassword),
                            const SizedBox(height: 6),
                            _inputBox(
                              gc: gc,
                              controller: _password,
                              hint: t.authPasswordHint,
                              icon: PhosphorIconsRegular.lockSimple,
                              obscure: _obscure,
                              onSubmitted: (_) => _submit(),
                              trailing: GestureDetector(
                                behavior: HitTestBehavior.opaque,
                                onTap: () => setState(() => _obscure = !_obscure),
                                child: Padding(
                                  padding: const EdgeInsets.all(8),
                                  child: Icon(
                                    _obscure ? PhosphorIconsRegular.eye : PhosphorIconsRegular.eyeSlash,
                                    size: 18,
                                    color: gc.textSecondary,
                                  ),
                                ),
                              ),
                            ),
                            if (!_register)
                              Align(
                                alignment: AlignmentDirectional.centerEnd,
                                child: GestureDetector(
                                  behavior: HitTestBehavior.opaque,
                                  onTap: _forgotPassword,
                                  child: Padding(
                                    padding: const EdgeInsets.only(top: 10, bottom: 2),
                                    child: Text(
                                      t.authForgotPassword,
                                      style: AppTheme.f(12.5, weight: FontWeight.w700, color: gc.accent),
                                    ),
                                  ),
                                ),
                              ),
                            if (_error != null) ...[
                              const SizedBox(height: 12),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                                decoration: BoxDecoration(
                                  color: gc.danger.withValues(alpha: 0.14),
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(color: gc.danger.withValues(alpha: 0.4)),
                                ),
                                child: Row(
                                  children: [
                                    Icon(PhosphorIconsFill.warningCircle, size: 16, color: gc.danger),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: Text(
                                        _error!,
                                        style: AppTheme.f(12.5, weight: FontWeight.w600, color: gc.danger),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                            const SizedBox(height: 18),
                            PrimaryButton(
                              label: _submitting
                                  ? (_register ? t.authCreatingAccount : t.authSigningIn)
                                  : (_register ? t.authCreateAccount : t.authSignIn),
                              onTap: _submitting ? null : _submit,
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 14),
                      Pressable(
                        onTap: _submitting ? null : _continueOffline,
                        child: Container(
                          height: 48,
                          decoration: BoxDecoration(
                            color: gc.bgRaised,
                            borderRadius: BorderRadius.circular(100),
                            border: Border.all(color: gc.border),
                          ),
                          alignment: Alignment.center,
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(PhosphorIconsRegular.wifiSlash, size: 16, color: gc.textSecondary),
                              const SizedBox(width: 8),
                              Text(
                                t.authContinueOffline,
                                style: AppTheme.f(14, weight: FontWeight.w700, color: gc.textSecondary),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 22),
                      Text(
                        t.authFooterLicense,
                        textAlign: TextAlign.center,
                        style: AppTheme.f(11.5, weight: FontWeight.w500, color: gc.textTertiary),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _modeTabs(GymColors gc) {
    Widget tab(String label, bool active, VoidCallback onTap) => Expanded(
          child: GestureDetector(
            behavior: HitTestBehavior.opaque,
            onTap: () {
              HapticFeedback.selectionClick();
              onTap();
            },
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 180),
              curve: Curves.easeOutCubic,
              height: 40,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: active ? gc.ember : Colors.transparent,
                borderRadius: BorderRadius.circular(100),
              ),
              child: Text(
                label,
                style: AppTheme.f(
                  13.5,
                  weight: FontWeight.w700,
                  color: active ? gc.onEmber : gc.textSecondary,
                ),
              ),
            ),
          ),
        );

    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: gc.bgRaised,
        borderRadius: BorderRadius.circular(100),
        border: Border.all(color: gc.border),
      ),
      child: Row(
        children: [
          tab(t.authSignIn, !_register, () => setState(() {
                _register = false;
                _error = null;
              })),
          tab(t.authCreateAccount, _register, () => setState(() {
                _register = true;
                _error = null;
              })),
        ],
      ),
    );
  }

  Widget _fieldLabel(GymColors gc, String text) => Padding(
        padding: const EdgeInsetsDirectional.only(start: 2),
        child: Text(
          text.toUpperCase(),
          style: AppTheme.f(10.5, weight: FontWeight.w700, color: gc.textTertiary, letterSpacing: 1.2),
        ),
      );

  Widget _inputBox({
    required GymColors gc,
    required TextEditingController controller,
    required String hint,
    required IconData icon,
    TextInputType? keyboardType,
    TextCapitalization capitalization = TextCapitalization.none,
    bool obscure = false,
    Widget? trailing,
    ValueChanged<String>? onSubmitted,
  }) =>
      Container(
        height: 48,
        padding: const EdgeInsetsDirectional.only(start: 14, end: 8),
        decoration: BoxDecoration(
          color: gc.bgRaised2,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: gc.border.withValues(alpha: 0.7)),
        ),
        child: Row(
          children: [
            Icon(icon, size: 17, color: gc.textSecondary),
            const SizedBox(width: 10),
            Expanded(
              child: TextField(
                controller: controller,
                obscureText: obscure,
                keyboardType: keyboardType,
                textCapitalization: capitalization,
                autocorrect: false,
                onSubmitted: onSubmitted,
                style: AppTheme.f(14.5, weight: FontWeight.w600, color: gc.text),
                cursorColor: gc.accent,
                decoration: InputDecoration(
                  isCollapsed: true,
                  border: InputBorder.none,
                  hintText: hint,
                  hintStyle: AppTheme.f(14, weight: FontWeight.w500, color: gc.textTertiary),
                ),
              ),
            ),
            if (trailing != null) trailing,
          ],
        ),
      );
}
