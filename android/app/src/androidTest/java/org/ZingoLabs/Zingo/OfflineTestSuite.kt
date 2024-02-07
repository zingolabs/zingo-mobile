package org.ZingoLabs.Zingo

import org.junit.runner.RunWith
import org.junit.experimental.categories.Categories
import org.junit.experimental.categories.Categories.IncludeCategory
import org.junit.runners.Suite.SuiteClasses

@RunWith(Categories::class)
@IncludeCategory(OfflineTest::class)
@SuiteClasses(ExecuteAddressesFromSeed::class, ExecuteAddressesFromUfvk::class, ExecuteVersionFromSeed::class)
class OfflineTestSuite {
}
