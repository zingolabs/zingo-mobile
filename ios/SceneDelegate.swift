//
//  SceneDelegate.swift
//  Zingo
//

import UIKit

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

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
        (UIApplication.shared.delegate as? AppDelegate)?.handleForeground()
    }

    func sceneDidEnterBackground(_ scene: UIScene) {
        (UIApplication.shared.delegate as? AppDelegate)?.handleBackground()
    }
}
