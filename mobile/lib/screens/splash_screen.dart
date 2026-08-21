import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:nyumbalink_mobile/providers/auth_provider.dart';
import 'package:nyumbalink_mobile/screens/home/map_home_screen.dart';
import 'package:nyumbalink_mobile/screens/auth/login_screen.dart';

/// First screen: restores any cached session for a fast startup, then routes
/// to the map (authenticated) or login.
class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});
  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  @override
  void initState() {
    super.initState();
    _init();
  }

  Future<void> _init() async {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    await auth.bootstrap();
    if (!mounted) return;
    if (auth.isAuthenticated) {
      Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const MapHomeScreen()));
    } else {
      Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const LoginScreen()));
    }
  }

  @override
  Widget build(BuildContext context) => const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
}
