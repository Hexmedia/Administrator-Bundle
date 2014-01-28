<?php

namespace Hexmedia\AdministratorBundle\ViewModel;

use Hexmedia\AdministratorBundle\Entity\SeoInterface;

class Seo {
    private $title;
    private $keywords;
    private $description;

    /**
     * @param mixed $description
     */
    public function setDescription($description)
    {
        $this->description = $description;
    }

    /**
     * @return mixed
     */
    public function getDescription()
    {
        return $this->description;
    }

    /**
     * @param mixed $keywords
     */
    public function setKeywords($keywords)
    {
        $this->keywords = $keywords;
    }

    /**
     * @return mixed
     */
    public function getKeywords()
    {
        return $this->keywords;
    }

    /**
     * @param mixed $title
     */
    public function setTitle($title)
    {
        $this->title = $title;
    }

    /**
     * @return mixed
     */
    public function getTitle()
    {
        return $this->title;
    }

    public function setFromObject(SeoInterface $obj) {
        $this->setTitle($obj->getSeoTitle() ? $obj->getSeoTitle() : $obj->getTitle());
        $this->setDescription($obj->getSeoDescription());
        $this->setKeywords($obj->getSeoKeywords());
    }
} 