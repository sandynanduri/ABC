package com.eligibility;

import com.eligibility.model.EligibilityResult;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.InputStream;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

public class EligibilityServiceTest {
    private EligibilityService service;
    private ObjectMapper objectMapper;

    @BeforeEach
    public void setUp() {
        service = new EligibilityService();
        objectMapper = new ObjectMapper();
    }

    @Test
    public void testPartyNotInMASEntities() throws Exception {
        InputStream inputStream = getClass().getResourceAsStream("/sample-input-1.json");
        Map<String, Object> inputData = objectMapper.readValue(inputStream, Map.class);
        
        EligibilityResult result = service.evaluate(inputData);
        
        assertFalse(result.isEligible());
        assertEquals("PARTY_EXEMPTION", result.getOosCategory());
        assertEquals("PartyRule", result.getMatchedRule());
        System.out.println("Test 1 - Party not in MAS_ENTITIES:");
        System.out.println("Result: " + objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(result));
    }

    @Test
    public void testPartyInMASEntitiesWithSingaporeNexus() throws Exception {
        InputStream inputStream = getClass().getResourceAsStream("/sample-input-2.json");
        Map<String, Object> inputData = objectMapper.readValue(inputStream, Map.class);
        
        EligibilityResult result = service.evaluate(inputData);
        
        assertTrue(result.isEligible());
        assertEquals("NEXUS_ELIGIBLE", result.getOosCategory());
        assertEquals("PartyRuleNexusEligibility", result.getMatchedRule());
        System.out.println("\nTest 2 - Party in MAS_ENTITIES with Singapore nexus:");
        System.out.println("Result: " + objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(result));
    }

    @Test
    public void testIntraEntityTransaction() throws Exception {
        InputStream inputStream = getClass().getResourceAsStream("/sample-input-3.json");
        Map<String, Object> inputData = objectMapper.readValue(inputStream, Map.class);
        
        EligibilityResult result = service.evaluate(inputData);
        
        assertFalse(result.isEligible());
        assertEquals("INTRA_ENTITY_EXEMPTION", result.getOosCategory());
        assertEquals("IntraEntityRule", result.getMatchedRule());
        System.out.println("\nTest 3 - Intra-entity transaction:");
        System.out.println("Result: " + objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(result));
    }

    @Test
    public void testProductTypeOutOfScope() throws Exception {
        InputStream inputStream = getClass().getResourceAsStream("/sample-input-4.json");
        Map<String, Object> inputData = objectMapper.readValue(inputStream, Map.class);
        
        EligibilityResult result = service.evaluate(inputData);
        
        assertFalse(result.isEligible());
        assertEquals("PRODUCT_TYPE_EXEMPTION", result.getOosCategory());
        assertEquals("ProductRule", result.getMatchedRule());
        System.out.println("\nTest 4 - Product type out of scope:");
        System.out.println("Result: " + objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(result));
    }

    @Test
    public void testCommodityExchangeTrade() throws Exception {
        InputStream inputStream = getClass().getResourceAsStream("/sample-input-5.json");
        Map<String, Object> inputData = objectMapper.readValue(inputStream, Map.class);
        
        EligibilityResult result = service.evaluate(inputData);
        
        assertFalse(result.isEligible());
        assertEquals("COMMODITY_EXEMPTION", result.getOosCategory());
        assertEquals("CommodityExchangeTradeRule", result.getMatchedRule());
        System.out.println("\nTest 5 - Commodity exchange trade:");
        System.out.println("Result: " + objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(result));
    }
}

