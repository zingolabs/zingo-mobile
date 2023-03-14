package org.ZingoLabs.Zingo

import org.junit.runner.RunWith
import org.junit.experimental.categories.Categories
import org.junit.experimental.categories.Categories.IncludeCategory
import org.junit.runners.Suite.SuiteClasses

@RunWith(Categories::class)
@IncludeCategory(IntegrationTest::class)
@SuiteClasses(ExecuteAddressesTest::class)
class IntegrationTestSuite {
}
