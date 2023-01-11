#import <React/RCTBridgeDelegate.h>
#import <UIKit/UIKit.h>

@interface AppDelegate : UIResponder <UIApplicationDelegate, RCTBridgeDelegate>

@property BOOL syncFinished;
@property (nonatomic, strong) UIWindow *window;

//-(void)syncingProcessBackgroundTask:(NSString *)noValue;
//-(void)syncingStatusProcessBackgroundTask:(NSString *)noValue;

@end
