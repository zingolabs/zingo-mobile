package org.ZingoLabs.Zingo

import androidx.test.platform.app.InstrumentationRegistry
import com.google.common.truth.Truth.assertWithMessage
import dalvik.system.DexFile
import org.junit.Test

/** The package that holds the instrumented test classes. */
private const val TEST_PACKAGE = "org.ZingoLabs.Zingo"

/** The Detox entry class, which carries no marker and leaves the repository with Detox. */
private const val DETOX_TEST_CLASS = "org.ZingoLabs.Zingo.DetoxTest"

/** The markers, one of which every instrumented test class carries. */
private val TEST_KIND_MARKERS = listOf(
    OfflineDeviceTest::class.java,
    StaticChainTest::class.java,
    LiveChainTest::class.java,
)

@OfflineDeviceTest
class EveryTestClassIsMarkedTest {
    @Test
    fun everyTestClassCarriesOneTestKindMarker() {
        val testApk = InstrumentationRegistry.getInstrumentation().context
        @Suppress("DEPRECATION")
        val classNames = DexFile(testApk.packageCodePath).entries().toList()

        val testClasses = classNames
            .filter { it.startsWith("$TEST_PACKAGE.") && it != DETOX_TEST_CLASS }
            .map { Class.forName(it, false, javaClass.classLoader) }
            .filter { testClass -> testClass.declaredMethods.any { it.isAnnotationPresent(Test::class.java) } }

        assertWithMessage("the scan of the test APK finds this test class")
            .that(testClasses)
            .contains(javaClass)

        val unmarked = testClasses
            .filter { testClass -> TEST_KIND_MARKERS.count { testClass.isAnnotationPresent(it) } != 1 }
            .map { it.name }

        assertWithMessage("test classes that do not carry exactly one test kind marker")
            .that(unmarked)
            .isEmpty()
    }
}
