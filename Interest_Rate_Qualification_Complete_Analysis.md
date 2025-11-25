# Complete Analysis: Interest Rate (IR) Product Qualification

## Overview

This document provides a comprehensive analysis of how Interest Rate (IR) products are qualified in the CDM product qualification system. It details the qualification logic, all fields accessed from EconomicTerms, and the complete information flow.

---

## 1. Qualification Function: `Qualify_AssetClass_InterestRate`

**Location:** `common-domain-model-5.27.0/rosetta-source/src/main/rosetta/product-qualification-func.rosetta` (Lines 24-54)

**Purpose:** Qualifies a product as having the Asset Class classification Interest Rate.

### Function Signature

```rosetta
func Qualify_AssetClass_InterestRate: <"Qualifies a product as having the Asset Class classification Interest Rate.">
    inputs:
        economicTerms EconomicTerms (1..1)
    output:
        is_product boolean (1..1)

    alias optionUnderlier: economicTerms -> payout -> optionPayout only-element -> underlier
    alias forwardUnderlier: economicTerms -> payout -> forwardPayout only-element -> underlier
```

**Note:** The aliases use `only-element`, which means they expect exactly one `optionPayout` or `forwardPayout` respectively. This is important for understanding the qualification logic.

---

## 2. Economic Terms Structure

The `EconomicTerms` type contains the following fields that are accessed during IR qualification:

```rosetta
type EconomicTerms:
    effectiveDate AdjustableOrRelativeDate (0..1)
    terminationDate AdjustableOrRelativeDate (0..1)
    dateAdjustments BusinessDayAdjustments (0..1)
    payout Payout (1..1)                    // ← PRIMARY FIELD ACCESSED
    terminationProvision TerminationProvision (0..1)
    calculationAgent CalculationAgent (0..1)
    nonStandardisedTerms boolean (0..1)
    collateral Collateral (0..1)
```

**Key Field:** `payout` (required field) - This is the primary field accessed for IR qualification.

---

## 3. Payout Structure and Fields Accessed

The `Payout` type contains multiple payout types. For IR qualification, the following payout fields are accessed:

```rosetta
type Payout:
    interestRatePayout InterestRatePayout (0..*)    // ← PRIMARY PAYOUT TYPE
    optionPayout OptionPayout (0..*)                  // ← ACCESSED FOR OPTIONS
    forwardPayout ForwardPayout (0..*)               // ← ACCESSED FOR FORWARDS
    cashflow Cashflow (0..*)                         // ← ACCESSED FOR FORWARDS
    creditDefaultPayout CreditDefaultPayout (0..1)
    commodityPayout CommodityPayout (0..*)
    fixedPricePayout FixedPricePayout (0..*)
    performancePayout PerformancePayout (0..*)
    assetPayout AssetPayout (0..*)
```

---

## 4. Alias Definitions

Before examining the qualification logic, it's important to understand the aliases used:

```rosetta
alias optionUnderlier: economicTerms -> payout -> optionPayout only-element -> underlier
alias forwardUnderlier: economicTerms -> payout -> forwardPayout only-element -> underlier
```

**Key Points:**
- `only-element` means exactly one `optionPayout` or `forwardPayout` is expected
- These aliases extract the `underlier` from the single payout instance
- The aliases are used to simplify the qualification conditions

---

## 5. Complete Qualification Logic Breakdown

The qualification function uses three main paths to determine if a product qualifies as Interest Rate:

### Path 1: Direct Interest Rate Payout

**Condition:**
```rosetta
economicTerms -> payout -> interestRatePayout only exists
```

**Meaning:** The product qualifies as IR if:
- `interestRatePayout` exists AND
- No other payout types exist (only `interestRatePayout`)
- This is a standalone condition (no additional checks needed)

**Fields Accessed:**
- `economicTerms.payout.interestRatePayout` - Checks existence and exclusivity
- No other payout types should exist

**Examples:**
- Interest Rate Swaps (IRS)
- Forward Rate Agreements (FRA)
- Interest Rate Caps/Floors
- OIS Swaps

---

### Path 2: Option Payout with IR Underlier

**Condition:**
```rosetta
economicTerms -> payout -> optionPayout only exists
    and (
        optionUnderlier -> security -> securityType = SecurityTypeEnum -> Debt
        or optionUnderlier -> security -> productTaxonomy -> primaryAssetClass any = AssetClassEnum -> InterestRate
        or optionUnderlier -> index -> productTaxonomy -> primaryAssetClass any = AssetClassEnum -> InterestRate
        or if optionUnderlier exists
            then Qualify_AssetClass_InterestRate(
                    optionUnderlier -> contractualProduct -> economicTerms
                ) = True
            or Qualify_AssetClass_InterestRate(
                    optionUnderlier -> security -> economicTerms
                ) = True
            else False
    )
```

**Fields Accessed from EconomicTerms:**
1. `economicTerms.payout.optionPayout` - Checks existence and exclusivity (must be only payout type)
2. `economicTerms.payout.optionPayout.underlier` - The underlying product (accessed via alias `optionUnderlier`)

**Note:** The alias `optionUnderlier` uses `only-element`, meaning exactly one `optionPayout` is expected.

**Fields Accessed from Underlier (Product type):**

The `Product` type can contain:
```rosetta
type Product:
    contractualProduct ContractualProduct (0..1)
    index Index (0..1)
    security Security (0..1)
    // ... other product types
```

**Fields Accessed from Security:**
- `underlier.security.securityType` - Checks if equals `SecurityTypeEnum.Debt`
- `underlier.security.productTaxonomy` - Accesses taxonomy information
- `underlier.security.productTaxonomy.primaryAssetClass` - Checks if equals `AssetClassEnum.InterestRate`
- `underlier.security.economicTerms` - Recursively checks qualification (for embedded products)

**Fields Accessed from Index:**
- `underlier.index.productTaxonomy` - Accesses taxonomy information
- `underlier.index.productTaxonomy.primaryAssetClass` - Checks if equals `AssetClassEnum.InterestRate`

**Fields Accessed from ContractualProduct:**
- `underlier.contractualProduct.economicTerms` - Recursively checks qualification (for embedded products)

**Qualification Criteria:**
The option qualifies as IR if the underlier is:
1. A Debt security (`securityType = Debt`), OR
2. A Security with `primaryAssetClass = InterestRate`, OR
3. An Index with `primaryAssetClass = InterestRate`, OR
4. If the underlier exists, then recursively check:
   - A ContractualProduct that itself qualifies as IR (via `contractualProduct.economicTerms`), OR
   - A Security with embedded `economicTerms` that qualifies as IR (via `security.economicTerms`)
   - If underlier doesn't exist, this path evaluates to False

**Examples:**
- Swaptions (options on interest rate swaps)
- Debt Options (options on bonds)

---

### Path 3: Forward Payout with IR Underlier

**Condition:**
```rosetta
(
    economicTerms -> payout -> forwardPayout only exists
    or (
        economicTerms -> payout -> forwardPayout exists
        and (
            economicTerms -> payout -> interestRatePayout exists
            or economicTerms -> payout -> cashflow exists
        )
    )
)
and (
    forwardUnderlier -> security -> securityType = SecurityTypeEnum -> Debt
    or forwardUnderlier -> security -> productTaxonomy -> primaryAssetClass any = AssetClassEnum -> InterestRate
    or forwardUnderlier -> index -> productTaxonomy -> primaryAssetClass any = AssetClassEnum -> InterestRate
)
```

**Fields Accessed from EconomicTerms:**
1. `economicTerms.payout.forwardPayout` - Checks existence (accessed via alias `forwardUnderlier`)
2. `economicTerms.payout.interestRatePayout` - Checks existence (for combined forwards)
3. `economicTerms.payout.cashflow` - Checks existence (for combined forwards)
4. `economicTerms.payout.forwardPayout.underlier` - The underlying product (accessed via alias `forwardUnderlier`)

**Note:** The alias `forwardUnderlier` uses `only-element`, meaning exactly one `forwardPayout` is expected.

**Fields Accessed from Underlier (Product type):**

**Fields Accessed from Security:**
- `underlier.security.securityType` - Checks if equals `SecurityTypeEnum.Debt`
- `underlier.security.productTaxonomy` - Accesses taxonomy information
- `underlier.security.productTaxonomy.primaryAssetClass` - Checks if equals `AssetClassEnum.InterestRate`

**Fields Accessed from Index:**
- `underlier.index.productTaxonomy` - Accesses taxonomy information
- `underlier.index.productTaxonomy.primaryAssetClass` - Checks if equals `AssetClassEnum.InterestRate`

**Qualification Criteria:**
The forward qualifies as IR if:
1. `forwardPayout` exists alone, OR
2. `forwardPayout` exists with `interestRatePayout` or `cashflow`, AND
3. The underlier is:
   - A Debt security (`securityType = Debt`), OR
   - A Security with `primaryAssetClass = InterestRate`, OR
   - An Index with `primaryAssetClass = InterestRate`

**Examples:**
- Bond Forwards
- Forward contracts on interest rate products

---

## 6. Complete Field Access Summary

### Direct Fields from EconomicTerms

| Field Path | Purpose | Used In |
|------------|---------|---------|
| `economicTerms.payout.interestRatePayout` | Check if IR payout exists/exclusive | Path 1, Path 3 |
| `economicTerms.payout.optionPayout` | Check if option payout exists/exclusive | Path 2 |
| `economicTerms.payout.forwardPayout` | Check if forward payout exists | Path 3 |
| `economicTerms.payout.cashflow` | Check if cashflow exists (with forward) | Path 3 |

### Fields from Option Underlier (Product)

| Field Path | Purpose | Used In |
|------------|---------|---------|
| `optionUnderlier.security.securityType` | Check if underlier is Debt security | Path 2 |
| `optionUnderlier.security.productTaxonomy` | Access taxonomy information | Path 2 |
| `optionUnderlier.security.productTaxonomy.primaryAssetClass` | Check if IR asset class | Path 2 |
| `optionUnderlier.index.productTaxonomy` | Access taxonomy information | Path 2 |
| `optionUnderlier.index.productTaxonomy.primaryAssetClass` | Check if IR asset class | Path 2 |
| `optionUnderlier.contractualProduct.economicTerms` | Recursive qualification check | Path 2 |
| `optionUnderlier.security.economicTerms` | Recursive qualification check | Path 2 |

### Fields from Forward Underlier (Product)

| Field Path | Purpose | Used In |
|------------|---------|---------|
| `forwardUnderlier.security.securityType` | Check if underlier is Debt security | Path 3 |
| `forwardUnderlier.security.productTaxonomy` | Access taxonomy information | Path 3 |
| `forwardUnderlier.security.productTaxonomy.primaryAssetClass` | Check if IR asset class | Path 3 |
| `forwardUnderlier.index.productTaxonomy` | Access taxonomy information | Path 3 |
| `forwardUnderlier.index.productTaxonomy.primaryAssetClass` | Check if IR asset class | Path 3 |

---

## 7. Data Type Structures Referenced

### Security Type Structure

```rosetta
type Security extends Listing:
    securityType SecurityTypeEnum (1..1)           // ← ACCESSED: Check for Debt
    productTaxonomy ProductTaxonomy (0..*)         // ← ACCESSED: Check primaryAssetClass
    economicTerms EconomicTerms (0..1)              // ← ACCESSED: Recursive qualification
    // ... other fields
```

### Index Type Structure

```rosetta
type Index extends ProductBase:
    productTaxonomy ProductTaxonomy (0..*)         // ← ACCESSED: Check primaryAssetClass
    // ... other fields
```

### ProductTaxonomy Type Structure

```rosetta
type ProductTaxonomy extends Taxonomy:
    primaryAssetClass AssetClassEnum (0..1)        // ← ACCESSED: Check for InterestRate
    secondaryAssetClass AssetClassEnum (0..*)
    productQualifier string (0..1)
    // ... other fields
```

### ContractualProduct Type Structure

```rosetta
type ContractualProduct extends ProductBase:
    economicTerms EconomicTerms (1..1)              // ← ACCESSED: Recursive qualification
    // ... other fields
```

---

## 8. Qualification Flow Diagram

```
Qualify_AssetClass_InterestRate(economicTerms)
│
├─ Path 1: Direct IR Payout
│  └─ Check: interestRatePayout only exists
│     └─ YES → Qualify as IR ✓
│
├─ Path 2: Option Payout
│  └─ Check: optionPayout only exists
│     └─ YES → Check Underlier:
│        ├─ security.securityType = Debt? → YES → Qualify as IR ✓
│        ├─ security.productTaxonomy.primaryAssetClass = InterestRate? → YES → Qualify as IR ✓
│        ├─ index.productTaxonomy.primaryAssetClass = InterestRate? → YES → Qualify as IR ✓
│        ├─ contractualProduct.economicTerms qualifies as IR? → YES → Qualify as IR ✓
│        └─ security.economicTerms qualifies as IR? → YES → Qualify as IR ✓
│
└─ Path 3: Forward Payout
   └─ Check: forwardPayout exists (alone or with interestRatePayout/cashflow)
      └─ YES → Check Underlier:
         ├─ security.securityType = Debt? → YES → Qualify as IR ✓
         ├─ security.productTaxonomy.primaryAssetClass = InterestRate? → YES → Qualify as IR ✓
         └─ index.productTaxonomy.primaryAssetClass = InterestRate? → YES → Qualify as IR ✓
```

---

## 9. Key Information Extracted from Economic Terms

### Primary Information
1. **Payout Type Presence**: Which payout types exist (`interestRatePayout`, `optionPayout`, `forwardPayout`, `cashflow`)
2. **Payout Exclusivity**: Whether only one payout type exists (for `interestRatePayout` and `optionPayout` paths)

### Secondary Information (for Options and Forwards)
1. **Underlier Type**: Whether underlier is a Security, Index, or ContractualProduct
2. **Security Type**: If underlier is Security, check if `securityType = Debt`
3. **Product Taxonomy**: Access `productTaxonomy` from Security or Index
4. **Primary Asset Class**: Check if `primaryAssetClass = InterestRate` in taxonomy
5. **Recursive Qualification**: For embedded products, recursively check if they qualify as IR

---

## 10. Examples of IR Product Qualification

### Example 1: Interest Rate Swap
```
EconomicTerms:
  payout:
    interestRatePayout: [2 instances]  // Fixed leg + Floating leg
    
Qualification: Path 1 → ✓ Qualifies as IR
Reason: interestRatePayout only exists
```

### Example 2: Swaption
```
EconomicTerms:
  payout:
    optionPayout:
      underlier:
        contractualProduct:
          economicTerms:
            payout:
              interestRatePayout: [2 instances]
              
Qualification: Path 2 → ✓ Qualifies as IR
Reason: optionPayout only exists AND underlier qualifies as IR (recursive)
```

### Example 3: Bond Forward
```
EconomicTerms:
  payout:
    forwardPayout:
      underlier:
        security:
          securityType: Debt
          
Qualification: Path 3 → ✓ Qualifies as IR
Reason: forwardPayout exists AND underlier.security.securityType = Debt
```

### Example 4: Debt Option
```
EconomicTerms:
  payout:
    optionPayout:
      underlier:
        security:
          securityType: Debt
          
Qualification: Path 2 → ✓ Qualifies as IR
Reason: optionPayout only exists AND underlier.security.securityType = Debt
```

---

## 11. Summary

### Fields Accessed from EconomicTerms

1. **`payout.interestRatePayout`** - Primary indicator for IR products
2. **`payout.optionPayout`** - For IR options (swaptions, debt options)
3. **`payout.forwardPayout`** - For IR forwards (bond forwards)
4. **`payout.cashflow`** - Can accompany forwardPayout

### Fields Accessed from Underlier Products

1. **`security.securityType`** - Check for Debt type
2. **`security.productTaxonomy.primaryAssetClass`** - Check for InterestRate classification
3. **`index.productTaxonomy.primaryAssetClass`** - Check for InterestRate classification
4. **`contractualProduct.economicTerms`** - Recursive qualification check
5. **`security.economicTerms`** - Recursive qualification check

### Qualification Logic

A product qualifies as Interest Rate if:
- It has **only** `interestRatePayout` (Path 1), OR
- It has **only** `optionPayout` with an IR-qualifying underlier (Path 2), OR
- It has `forwardPayout` (alone or with `interestRatePayout`/`cashflow`) with an IR-qualifying underlier (Path 3)

The qualification system uses a composable, recursive approach that allows products to be nested (e.g., options on swaps) while maintaining clear qualification criteria based on the economic terms structure.

