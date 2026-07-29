//
//  SceneDelegate.swift
//  Zingo
//

import UIKit

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?
    private var privacyWindow: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }
        let appDelegate = UIApplication.shared.delegate as! AppDelegate
        let window = UIWindow(windowScene: windowScene)
        self.window = window
        appDelegate.window = window
        appDelegate.reactNativeFactory?.startReactNative(
            withModuleName: "Zingo",
            in: window,
            launchOptions: nil
        )
    }

    func sceneWillEnterForeground(_ scene: UIScene) {
        hidePrivacyOverlay()
        (UIApplication.shared.delegate as? AppDelegate)?.handleForeground()
    }

    // iOS captures the app-switcher snapshot between willResignActive and
    // didEnterBackground, so the overlay has to be installed here.
    //
    // Applied to every configuration, beta included: beta has to behave
    // exactly like the build that ships, or beta testing proves nothing
    // about prod.
    func sceneWillResignActive(_ scene: UIScene) {
        showPrivacyOverlay(on: scene)
    }

    func sceneDidBecomeActive(_ scene: UIScene) {
        hidePrivacyOverlay()
    }

    func sceneDidEnterBackground(_ scene: UIScene) {
        (UIApplication.shared.delegate as? AppDelegate)?.handleBackground()
    }

    private func showPrivacyOverlay(on scene: UIScene) {
        guard privacyWindow == nil,
              let windowScene = scene as? UIWindowScene else { return }

        let overlay = UIWindow(windowScene: windowScene)
        overlay.windowLevel = .alert + 1
        overlay.backgroundColor = .black
        let vc = UIViewController()
        vc.view.backgroundColor = .black
        overlay.rootViewController = vc
        overlay.isHidden = false
        privacyWindow = overlay
    }

    private func hidePrivacyOverlay() {
        privacyWindow?.isHidden = true
        privacyWindow = nil
    }
}
