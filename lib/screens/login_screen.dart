import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:phosphoricons_flutter/phosphoricons_flutter.dart';

import '../l10n/l10n.dart';
import '../models/profile.dart';
import '../services/auth_service.dart';
import '../state/fit_state.dart';
import '../theme/app_colors.dart';
import '../theme/app_theme.dart';
import '../widgets/entrance.dart';
import '../widgets/liquid_notch.dart';
import '../widgets/ui_kit.dart';

const _kSlide = Duration(milliseconds: 380);
const _kSlideCurve = Cubic(0.22, 1, 0.36, 1);

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

  void _setMode(bool register) {
    if (_register == register) return;
    HapticFeedback.selectionClick();
    setState(() {
      _register = register;
      _error = null;
    });
  }

  Future<void> _submit() async {
    if (_submitting || AuthService.instance.busy) return;
    HapticFeedback.selectionClick();
    FocusScope.of(context).unfocus();
    setState(() {
      _error = null;
      _submitting = true;
    });

    final auth = AuthService.instance;
    final err = _register
        ? await auth.register(_name.text, _email.text, _password.text)
        : await auth.signIn(_email.text, _password.text);

    if (!mounted) return;
    if (err != null) {
      HapticFeedback.heavyImpact();
      setState(() {
        _error = err;
        _submitting = false;
      });
      return;
    }
    await _afterSignIn(pullBackup: !_register);
    if (mounted) setState(() => _submitting = false);
  }

  Future<void> _social(Future<String?> Function() run) async {
    if (_submitting || AuthService.instance.busy) return;
    HapticFeedback.selectionClick();
    FocusScope.of(context).unfocus();
    setState(() => _error = null);
    final err = await run();
    if (!mounted) return;
    if (err == kAuthCancelled) return;
    if (err != null) {
      HapticFeedback.heavyImpact();
      setState(() => _error = err);
      return;
    }
    await _afterSignIn(pullBackup: true);
  }

  Future<void> _afterSignIn({required bool pullBackup}) async {
    final auth = AuthService.instance;
    final user = auth.user;
    if (user == null) return;
    if (user.displayName.trim().isNotEmpty &&
        (fit.profile.name == kDefaultName || fit.profile.name.trim().isEmpty)) {
      fit.updateProfile(name: user.displayName.trim());
    }
    if (pullBackup) {
      final pulled = await auth.pullCloudBackup();
      if (pulled.data != null && pulled.data!.isNotEmpty) fit.applyBackup(pulled.data!);
    }
    fit.persistNow();
  }

  Future<void> _continueOffline() async {
    if (_submitting || AuthService.instance.busy) return;
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
                Text(t.authResetTitle, style: AppTheme.f(21, weight: FontWeight.w800, color: gc.text)),
                const SizedBox(height: 6),
                Text(
                  t.authResetBody,
                  style: AppTheme.f(13.5, weight: FontWeight.w500, color: gc.textSecondary, height: 1.4),
                ),
                const SizedBox(height: 16),
                _InputBox(
                  controller: ctrl,
                  hint: 'you@example.com',
                  icon: PhosphorIconsRegular.envelopeSimple,
                  keyboardType: TextInputType.emailAddress,
                ),
                _AnimatedError(message: sheetError),
                const SizedBox(height: 18),
                _CtaButton(
                  label: t.authResetSend,
                  loading: sending,
                  onTap: () async {
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
    final auth = AuthService.instance;
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
                    colors: [gc.accent.withValues(alpha: 0.22), gc.bg.withValues(alpha: 0)],
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
                  child: AnimatedBuilder(
                    animation: auth,
                    builder: (context, _) => RiseScope(
                      id: 'login',
                      once: false,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: riseAll([
                          _header(gc),
                          const SizedBox(height: 24),
                          _SlidingTabs(
                            labels: (t.authSignIn, t.authCreateAccount),
                            second: _register,
                            onChanged: _setMode,
                          ),
                          const SizedBox(height: 16),
                          _formCard(gc),
                          const SizedBox(height: 18),
                          _OrDivider(label: t.authOrContinueWith),
                          const SizedBox(height: 14),
                          Row(
                            children: [
                              Expanded(
                                child: _SocialButton(
                                  label: t.authGoogle,
                                  icon: PhosphorIconsBold.googleLogo,
                                  loading: auth.socialBusy == 'google.com',
                                  enabled: !auth.busy && !_submitting,
                                  onTap: () => _social(auth.signInWithGoogle),
                                ),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: _SocialButton(
                                  label: t.authApple,
                                  icon: PhosphorIconsFill.appleLogo,
                                  dark: true,
                                  loading: auth.socialBusy == 'apple.com',
                                  enabled: !auth.busy && !_submitting,
                                  onTap: () => _social(auth.signInWithApple),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 14),
                          _offlineButton(gc),
                          const SizedBox(height: 22),
                          Text(
                            t.authFooterLicense,
                            textAlign: TextAlign.center,
                            style: AppTheme.f(11.5, weight: FontWeight.w500, color: gc.textTertiary),
                          ),
                        ]),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _header(GymColors gc) => Column(
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
                errorBuilder: (_, _, _) => Icon(PhosphorIconsFill.barbell, size: 34, color: gc.accent),
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
          AnimatedSwitcher(
            duration: const Duration(milliseconds: 260),
            transitionBuilder: (child, a) => FadeTransition(
              opacity: a,
              child: SlideTransition(
                position: Tween(begin: const Offset(0, 0.25), end: Offset.zero).animate(a),
                child: child,
              ),
            ),
            child: Text(
              _register ? t.authRegisterSubtitle : t.authSignInSubtitle,
              key: ValueKey(_register),
              textAlign: TextAlign.center,
              style: AppTheme.f(14, weight: FontWeight.w500, color: gc.textSecondary, height: 1.4),
            ),
          ),
        ],
      );

  Widget _formCard(GymColors gc) => SoftCard(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            AnimatedSize(
              duration: _kSlide,
              curve: _kSlideCurve,
              alignment: Alignment.topCenter,
              child: AnimatedSwitcher(
                duration: const Duration(milliseconds: 240),
                transitionBuilder: (child, a) => FadeTransition(
                  opacity: a,
                  child: SlideTransition(
                    position: Tween(begin: const Offset(-0.06, 0), end: Offset.zero).animate(a),
                    child: child,
                  ),
                ),
                child: !_register
                    ? const SizedBox(key: ValueKey('no-name'), width: double.infinity)
                    : Column(
                        key: const ValueKey('name'),
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          _FieldLabel(t.authDisplayName),
                          const SizedBox(height: 6),
                          _InputBox(
                            controller: _name,
                            hint: kDefaultName,
                            icon: PhosphorIconsRegular.user,
                            capitalization: TextCapitalization.words,
                          ),
                          const SizedBox(height: 14),
                        ],
                      ),
              ),
            ),
            _FieldLabel(t.authEmail),
            const SizedBox(height: 6),
            _InputBox(
              controller: _email,
              hint: 'you@example.com',
              icon: PhosphorIconsRegular.envelopeSimple,
              keyboardType: TextInputType.emailAddress,
            ),
            const SizedBox(height: 14),
            _FieldLabel(t.authPassword),
            const SizedBox(height: 6),
            _InputBox(
              controller: _password,
              hint: t.authPasswordHint,
              icon: PhosphorIconsRegular.lockSimple,
              obscure: _obscure,
              onSubmitted: (_) => _submit(),
              trailing: GestureDetector(
                behavior: HitTestBehavior.opaque,
                onTap: () {
                  HapticFeedback.selectionClick();
                  setState(() => _obscure = !_obscure);
                },
                child: Padding(
                  padding: const EdgeInsets.all(8),
                  child: AnimatedSwitcher(
                    duration: const Duration(milliseconds: 200),
                    transitionBuilder: (child, a) => RotationTransition(
                      turns: Tween(begin: 0.75, end: 1.0).animate(a),
                      child: FadeTransition(opacity: a, child: child),
                    ),
                    child: Icon(
                      _obscure ? PhosphorIconsRegular.eye : PhosphorIconsRegular.eyeSlash,
                      key: ValueKey(_obscure),
                      size: 18,
                      color: gc.textSecondary,
                    ),
                  ),
                ),
              ),
            ),
            AnimatedSize(
              duration: _kSlide,
              curve: _kSlideCurve,
              alignment: Alignment.topCenter,
              child: _register
                  ? const SizedBox(width: double.infinity)
                  : Align(
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
            ),
            _AnimatedError(message: _error),
            const SizedBox(height: 18),
            _CtaButton(
              label: _register ? t.authCreateAccount : t.authSignIn,
              loading: _submitting,
              onTap: _submit,
            ),
          ],
        ),
      );

  Widget _offlineButton(GymColors gc) => Pressable(
        onTap: _submitting ? null : _continueOffline,
        scale: 0.96,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 220),
          curve: Curves.easeOutCubic,
          height: 48,
          decoration: BoxDecoration(
            color: gc.bgRaised,
            borderRadius: BorderRadius.circular(100),
            border: Border.all(color: gc.border),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 14),
          alignment: Alignment.center,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(PhosphorIconsRegular.wifiSlash, size: 16, color: gc.textSecondary),
              const SizedBox(width: 8),
              Flexible(
                child: FittedBox(
                  fit: BoxFit.scaleDown,
                  child: Text(
                    t.authContinueOffline,
                    maxLines: 1,
                    style: AppTheme.f(14, weight: FontWeight.w700, color: gc.textSecondary),
                  ),
                ),
              ),
            ],
          ),
        ),
      );
}

/// Interactive sliding pill bar supporting both tap and horizontal swipe with liquid stretch.
class _SlidingTabs extends StatefulWidget {
  const _SlidingTabs({required this.labels, required this.second, required this.onChanged});

  final (String, String) labels;
  final bool second;
  final ValueChanged<bool> onChanged;

  @override
  State<_SlidingTabs> createState() => _SlidingTabsState();
}

class _SlidingTabsState extends State<_SlidingTabs> with TickerProviderStateMixin {
  late final AnimationController _slide = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 420),
    value: 1,
  );
  late final AnimationController _lift = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 180),
    reverseDuration: const Duration(milliseconds: 280),
  );

  late double _from = widget.second ? 1.0 : 0.0;
  late double _pos = _from;
  double? _dragPos;

  @override
  void didUpdateWidget(_SlidingTabs old) {
    super.didUpdateWidget(old);
    if (old.second != widget.second && _dragPos == null) {
      _from = _pos;
      _slide.forward(from: 0);
    }
  }

  @override
  void dispose() {
    _slide.dispose();
    _lift.dispose();
    super.dispose();
  }

  void _startDrag(double dx, double width) {
    final track = (width - 8).clamp(1.0, double.infinity);
    _lift.forward();
    setState(() {
      _dragPos = ((dx - track * 0.25) / (track * 0.5)).clamp(0.0, 1.0);
    });
  }

  void _updateDrag(double deltaDx, double width) {
    final cur = _dragPos;
    if (cur == null) return;
    final track = (width - 8).clamp(1.0, double.infinity);
    setState(() {
      _dragPos = (cur + deltaDx / (track * 0.5)).clamp(0.0, 1.0);
    });
  }

  void _endDrag() {
    final cur = _dragPos;
    if (cur == null) return;
    final targetSecond = cur >= 0.5;
    _lift.reverse();
    setState(() {
      _from = cur;
      _pos = cur;
      _dragPos = null;
    });
    if (targetSecond != widget.second) {
      widget.onChanged(targetSecond);
    }
    _slide.forward(from: 0);
  }

  @override
  Widget build(BuildContext context) {
    final gc = context.gc;
    Widget tabLabel(String text, bool active, bool value) => Expanded(
          child: Pressable(
            onTap: () => widget.onChanged(value),
            scale: 0.96,
            child: Center(
              child: AnimatedDefaultTextStyle(
                duration: const Duration(milliseconds: 240),
                curve: Curves.easeOut,
                style: AppTheme.f(
                  13.5,
                  weight: FontWeight.w700,
                  color: active ? gc.onEmber : gc.textSecondary,
                ),
                child: FittedBox(fit: BoxFit.scaleDown, child: Text(text, maxLines: 1)),
              ),
            ),
          ),
        );

    return LayoutBuilder(
      builder: (context, constraints) {
        final w = constraints.maxWidth;
        final trackW = (w - 8).clamp(2.0, double.infinity);
        final pillW = trackW * 0.5;

        return GestureDetector(
          behavior: HitTestBehavior.translucent,
          onHorizontalDragStart: (d) {
            HapticFeedback.selectionClick();
            _startDrag(d.localPosition.dx, w);
          },
          onHorizontalDragUpdate: (d) => _updateDrag(d.delta.dx, w),
          onHorizontalDragEnd: (_) => _endDrag(),
          onHorizontalDragCancel: _endDrag,
          child: Container(
            height: 48,
            padding: const EdgeInsets.all(4),
            decoration: BoxDecoration(
              color: gc.bgRaised,
              borderRadius: BorderRadius.circular(100),
              border: Border.all(color: gc.border),
            ),
            child: Stack(
              clipBehavior: Clip.none,
              children: [
                AnimatedBuilder(
                  animation: Listenable.merge([_slide, _lift]),
                  builder: (context, _) {
                    final target = widget.second ? 1.0 : 0.0;
                    final lift = Curves.easeOutBack.transform(_lift.value.clamp(0.0, 1.0));
                    final double left;
                    final double right;
                    if (_dragPos != null) {
                      left = _dragPos! * pillW;
                      right = left + pillW;
                      _pos = _dragPos!;
                    } else {
                      final t = _slide.value;
                      final movingRight = target >= _from;
                      final lead = const Cubic(0.2, 1.32, 0.35, 1).transform(t);
                      final trail = const Cubic(0.45, 0, 0.2, 1).transform(t);
                      final pL = _from + (target - _from) * (movingRight ? trail : lead);
                      final pR = _from + (target - _from) * (movingRight ? lead : trail);
                      _pos = pL;
                      left = pL * pillW;
                      right = pR * pillW + pillW;
                    }
                    final inset = 1.5 * lift;
                    final pillLeft = left.clamp(0.0, trackW - 24);
                    final pillWidth = (right - left).clamp(24.0, trackW - pillLeft);

                    return Positioned(
                      left: pillLeft,
                      width: pillWidth,
                      top: -inset,
                      bottom: -inset,
                      child: DecoratedBox(
                        decoration: BoxDecoration(
                          color: gc.ember,
                          borderRadius: BorderRadius.circular(100),
                          boxShadow: [
                            BoxShadow(
                              color: gc.emberShadow,
                              blurRadius: 10 + 6 * lift,
                              offset: Offset(0, 3 + 2 * lift),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
                Row(
                  children: [
                    tabLabel(widget.labels.$1, !widget.second, false),
                    tabLabel(widget.labels.$2, widget.second, true),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

/// Primary button: press-scale, label cross-fades on change, spinner while loading.
class _CtaButton extends StatelessWidget {
  const _CtaButton({required this.label, required this.loading, required this.onTap});

  final String label;
  final bool loading;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final gc = context.gc;
    return Pressable(
      onTap: loading ? null : onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 260),
        curve: Curves.easeOutCubic,
        height: 52,
        decoration: BoxDecoration(
          color: loading ? gc.ember.withValues(alpha: 0.75) : gc.ember,
          borderRadius: BorderRadius.circular(100),
          boxShadow: loading
              ? const []
              : [BoxShadow(color: gc.emberShadow, blurRadius: 14, offset: const Offset(0, 5))],
        ),
        alignment: Alignment.center,
        child: AnimatedSwitcher(
          duration: const Duration(milliseconds: 240),
          transitionBuilder: (child, a) => FadeTransition(
            opacity: a,
            child: ScaleTransition(scale: Tween(begin: 0.85, end: 1.0).animate(a), child: child),
          ),
          child: loading
              ? SizedBox(
                  key: const ValueKey('spin'),
                  width: 22,
                  height: 22,
                  child: CircularProgressIndicator(strokeWidth: 2.4, color: gc.onEmber),
                )
              : Text(
                  label,
                  key: ValueKey(label),
                  style: AppTheme.f(15.5, weight: FontWeight.w700, color: gc.onEmber, letterSpacing: 0.2),
                ),
        ),
      ),
    );
  }
}

class _SocialButton extends StatelessWidget {
  const _SocialButton({
    required this.label,
    required this.icon,
    required this.loading,
    required this.enabled,
    required this.onTap,
    this.dark = false,
  });

  final String label;
  final IconData icon;
  final bool loading;
  final bool enabled;
  final bool dark;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final gc = context.gc;
    final bg = dark ? gc.text : gc.bgRaised;
    final fg = dark ? gc.bg : gc.text;
    return Pressable(
      onTap: enabled ? onTap : null,
      scale: 0.95,
      child: AnimatedOpacity(
        duration: const Duration(milliseconds: 200),
        opacity: enabled || loading ? 1 : 0.55,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 220),
          curve: Curves.easeOutCubic,
          height: 50,
          padding: const EdgeInsets.symmetric(horizontal: 12),
          decoration: BoxDecoration(
            color: loading ? bg.withValues(alpha: 0.85) : bg,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: dark ? bg : (loading ? gc.accent : gc.border)),
            boxShadow: loading ? [BoxShadow(color: gc.accentSoft, blurRadius: 12)] : const [],
          ),
          child: AnimatedSwitcher(
            duration: const Duration(milliseconds: 220),
            child: loading
                ? Center(
                    key: const ValueKey('spin'),
                    child: SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2.2, color: fg),
                    ),
                  )
                : Row(
                    key: const ValueKey('label'),
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(icon, size: 19, color: fg),
                      const SizedBox(width: 8),
                      Flexible(
                        child: FittedBox(
                          fit: BoxFit.scaleDown,
                          child: Text(label, maxLines: 1, style: AppTheme.f(14.5, weight: FontWeight.w700, color: fg)),
                        ),
                      ),
                    ],
                  ),
          ),
        ),
      ),
    );
  }
}

class _OrDivider extends StatelessWidget {
  const _OrDivider({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    final gc = context.gc;
    final line = Expanded(child: Container(height: 1, color: gc.border.withValues(alpha: 0.7)));
    return Row(
      children: [
        line,
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          child: Text(
            label.toUpperCase(),
            style: AppTheme.f(10.5, weight: FontWeight.w700, color: gc.textTertiary, letterSpacing: 1.2),
          ),
        ),
        line,
      ],
    );
  }
}

class _AnimatedError extends StatelessWidget {
  const _AnimatedError({required this.message});

  final String? message;

  @override
  Widget build(BuildContext context) {
    final gc = context.gc;
    final msg = message;
    return AnimatedSize(
      duration: const Duration(milliseconds: 260),
      curve: Curves.easeOutCubic,
      alignment: Alignment.topCenter,
      child: AnimatedSwitcher(
        duration: const Duration(milliseconds: 220),
        child: msg == null
            ? const SizedBox(key: ValueKey('none'), width: double.infinity)
            : Padding(
                key: ValueKey(msg),
                padding: const EdgeInsets.only(top: 12),
                child: Container(
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
                        child: Text(msg, style: AppTheme.f(12.5, weight: FontWeight.w600, color: gc.danger)),
                      ),
                    ],
                  ),
                ),
              ),
      ),
    );
  }
}

class _FieldLabel extends StatelessWidget {
  const _FieldLabel(this.text);

  final String text;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsetsDirectional.only(start: 2),
        child: Text(
          text.toUpperCase(),
          style: AppTheme.f(10.5, weight: FontWeight.w700, color: context.gc.textTertiary, letterSpacing: 1.2),
        ),
      );
}

/// Text field whose border glows with the accent colour while focused.
class _InputBox extends StatefulWidget {
  const _InputBox({
    required this.controller,
    required this.hint,
    required this.icon,
    this.keyboardType,
    this.capitalization = TextCapitalization.none,
    this.obscure = false,
    this.trailing,
    this.onSubmitted,
  });

  final TextEditingController controller;
  final String hint;
  final IconData icon;
  final TextInputType? keyboardType;
  final TextCapitalization capitalization;
  final bool obscure;
  final Widget? trailing;
  final ValueChanged<String>? onSubmitted;

  @override
  State<_InputBox> createState() => _InputBoxState();
}

class _InputBoxState extends State<_InputBox> {
  final _focus = FocusNode();

  @override
  void initState() {
    super.initState();
    _focus.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _focus.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final gc = context.gc;
    final on = _focus.hasFocus;
    return AnimatedContainer(
      duration: const Duration(milliseconds: 200),
      curve: Curves.easeOut,
      height: 48,
      padding: const EdgeInsetsDirectional.only(start: 14, end: 8),
      decoration: BoxDecoration(
        color: gc.bgRaised2,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: on ? gc.accent : gc.border.withValues(alpha: 0.7), width: on ? 1.5 : 1),
        boxShadow: on ? [BoxShadow(color: gc.accentSoft, blurRadius: 12)] : const [],
      ),
      child: Row(
        children: [
          Icon(widget.icon, size: 17, color: on ? gc.accent : gc.textSecondary),
          const SizedBox(width: 10),
          Expanded(
            child: TextField(
              controller: widget.controller,
              focusNode: _focus,
              obscureText: widget.obscure,
              keyboardType: widget.keyboardType,
              textCapitalization: widget.capitalization,
              autocorrect: false,
              onSubmitted: widget.onSubmitted,
              style: AppTheme.f(14.5, weight: FontWeight.w600, color: gc.text),
              cursorColor: gc.accent,
              decoration: InputDecoration(
                isCollapsed: true,
                border: InputBorder.none,
                hintText: widget.hint,
                hintStyle: AppTheme.f(14, weight: FontWeight.w500, color: gc.textTertiary),
              ),
            ),
          ),
          if (widget.trailing != null) widget.trailing!,
        ],
      ),
    );
  }
}
