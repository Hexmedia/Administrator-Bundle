<?php

namespace Hexmedia\AdministratorBundle\Model;


/**
 * Trait SeoTrait
 * @package Hexmedia\AdministratorBundle\Entity
 */
trait SeoTrait {
    /**
     * @var string
     *
     * @ORM\Column(name="seo_title", type="string", length=255, nullable=true)
     */
    private $seoTitle;
    /**
     * @var string
     *
     * @ORM\Column(name="seo_keywords", type="string", length=500, nullable=true)
     */
    private $seoKeywords;
    /**
     * @var string
     *
     * @ORM\Column(name="seo_description", type="string", length=500, nullable=true)
     */
    private $seoDescription;

    /**
     * Get seoTitle
     *
     * @return string
     */
    public function getSeoTitle()
    {
        return $this->seoTitle;
    }

    /**
     * Set seoTitle
     *
     * @param string $seoTitle
     * @return Page
     */
    public function setSeoTitle($seoTitle)
    {
        $this->seoTitle = $seoTitle;

        return $this;
    }

    /**
     * Get seoKeywords
     *
     * @return string
     */
    public function getSeoKeywords()
    {
        return $this->seoKeywords;
    }

    /**
     * Set seoKeywords
     *
     * @param string $seoKeywords
     * @return Page
     */
    public function setSeoKeywords($seoKeywords)
    {
        $this->seoKeywords = $seoKeywords;

        return $this;
    }

    /**
     * Get seoDescription
     *
     * @return string
     */
    public function getSeoDescription()
    {
        return $this->seoDescription;
    }

    /**
     * Set seoDescription
     *
     * @param string $seoDescription
     * @return Page
     */
    public function setSeoDescription($seoDescription)
    {
        $this->seoDescription = $seoDescription;

        return $this;
    }
}