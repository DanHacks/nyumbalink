import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:nyumbalink_mobile/core/api.dart';
import 'package:nyumbalink_mobile/core/config.dart';
import 'package:nyumbalink_mobile/core/storage.dart';
import 'package:nyumbalink_mobile/providers/auth_provider.dart';
import 'package:nyumbalink_mobile/screens/splash_screen.dart';

/// NyumbaLink mobile entry point.
///
/// The app is a light client: it boots, restores any cached session for a fast
/// startup, and talks to a powerful cloud backend. No property media, maps, or
/// offline data is bundled (product spec #60).
void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final saved = await AppStorage.getServer();
  ApiClient.server = saved ?? kDefaultApiBaseUrl;
  ApiClient.init();
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => AuthProvider(),
      child: MaterialApp(
        title: kAppName,
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          useMaterial3: true,
          colorScheme: ColorScheme.fromSeed(seedColor: Colors.teal, brightness: Brightness.light),
          filledButtonTheme: FilledButtonThemeData(
            style: FilledButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
          ),
          inputDecorationTheme: InputDecorationTheme(
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
            filled: true,
            fillColor: Colors.grey[50],
          ),
        ),
        home: const SplashScreen(),
      ),
    );
  }
}
