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
            launchOptions: SceneDelegate.launchOptions(from: connectionOptions)
        )
    }

    // With the scene life cycle UIKit delivers opened URLs and universal links to the scene
    // delegate; AppDelegate's application(_:open:options:) and application(_:continue:...) are
    // no longer called, so zcash: links never reached Linking.addEventListener.
    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        guard let url = URLContexts.first?.url else { return }
        RCTLinkingManager.application(UIApplication.shared, open: url, options: [:])
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        _ = RCTLinkingManager.application(UIApplication.shared, continue: userActivity, restorationHandler: { _ in })
    }

    // A link that launches the app arrives in the connection options. Linking.getInitialURL()
    // reads it from the launch options React Native is started with.
    static func launchOptions(from options: UIScene.ConnectionOptions) -> [UIApplication.LaunchOptionsKey: Any]? {
        if let url = options.urlContexts.first?.url {
            return [.url: url]
        }
        if let activity = options.userActivities.first(where: { $0.activityType == NSUserActivityTypeBrowsingWeb }) {
            return [.userActivityDictionary: [
                UIApplication.LaunchOptionsKey.userActivityType: activity.activityType,
                "UIApplicationLaunchOptionsUserActivityKey": activity,
            ]]
        }
        return nil
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
